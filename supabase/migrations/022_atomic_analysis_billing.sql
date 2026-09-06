-- Apply before deploying the new submission/worker code. No client-side fallback.
-- If credits has duplicate user_id rows, reconcile them deliberately first;
-- this migration refuses to guess which balance is authoritative.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS credits_one_balance_per_user ON public.credits (user_id);
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS credits_reserved_at timestamptz;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS credits_refunded_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_analysis_with_credit(
  p_user_id uuid,
  p_source_url text,
  p_platform text,
  p_note text DEFAULT NULL,
  p_source text DEFAULT 'web',
  p_analysis_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_credit public.credits%ROWTYPE;
  v_existing public.analyses%ROWTYPE;
  v_analysis_id uuid := COALESCE(p_analysis_id, pg_catalog.gen_random_uuid());
  v_changed integer;
BEGIN
  IF p_user_id IS NULL OR p_source_url IS NULL OR length(p_source_url) > 8192
     OR p_source_url !~ '^https?://[^[:space:]]+$'
     OR p_platform IS NULL OR p_platform NOT IN ('instagram', 'tiktok', 'x', 'linkedin', 'youtube', 'article')
     OR p_source IS NULL OR p_source NOT IN ('web', 'telegram')
     OR (p_note IS NOT NULL AND length(p_note) > 4000) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ANALYSIS_INPUT';
  END IF;

  -- All reservations for one user serialize here. Never read then overwrite an
  -- earlier balance from application memory.
  SELECT * INTO v_credit FROM public.credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_CREDITS';
  END IF;

  -- A caller can retry an uncertain RPC response with the same analysis id.
  SELECT * INTO v_existing FROM public.analyses WHERE id = v_analysis_id;
  IF FOUND THEN
    IF v_existing.user_id = p_user_id AND v_existing.source_url = p_source_url
       AND v_existing.platform = p_platform AND v_existing.source = p_source
       AND v_existing.credits_reserved_at IS NOT NULL
       AND COALESCE(v_existing.metadata->>'userNote', '') = COALESCE(NULLIF(btrim(p_note), ''), '') THEN
      RETURN v_existing.id;
    END IF;
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ANALYSIS_ID_CONFLICT';
  END IF;

  IF v_credit.balance < 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_CREDITS';
  END IF;
  UPDATE public.credits SET balance = balance - 1, lifetime_used = lifetime_used + 1
    WHERE id = v_credit.id AND balance >= 1;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CREDIT_RESERVATION_FAILED';
  END IF;

  -- Any insert error rolls the reservation back in the same transaction.
  INSERT INTO public.analyses (id, user_id, source_url, platform, source, status, metadata, credits_charged, credits_reserved_at)
  VALUES (v_analysis_id, p_user_id, p_source_url, p_platform, p_source, 'pending',
    CASE WHEN NULLIF(btrim(p_note), '') IS NULL THEN NULL ELSE pg_catalog.jsonb_build_object('userNote', btrim(p_note)) END,
    1, pg_catalog.now());
  RETURN v_analysis_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_analysis_credit(p_analysis_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_analysis public.analyses%ROWTYPE;
  v_credit_id uuid;
  v_changed integer;
BEGIN
  IF p_analysis_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ANALYSIS_ID';
  END IF;
  SELECT * INTO v_analysis FROM public.analyses WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ANALYSIS_NOT_FOUND';
  END IF;
  IF v_analysis.credits_refunded_at IS NOT NULL THEN RETURN false; END IF;
  IF v_analysis.credits_reserved_at IS NULL THEN
    -- Historical code refunded by user id without a ledger. Do not refund old
    -- rows again merely because their status is failed; reconcile those manually.
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LEGACY_ANALYSIS_REQUIRES_BILLING_REVIEW';
  END IF;
  IF v_analysis.status <> 'failed' OR v_analysis.credits_charged <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ANALYSIS_NOT_REFUNDABLE';
  END IF;

  SELECT id INTO v_credit_id FROM public.credits WHERE user_id = v_analysis.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CREDIT_ACCOUNT_NOT_FOUND'; END IF;
  UPDATE public.credits SET balance = balance + v_analysis.credits_charged,
    lifetime_used = GREATEST(0, lifetime_used - v_analysis.credits_charged)
    WHERE id = v_credit_id;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 1 THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CREDIT_REFUND_FAILED'; END IF;
  UPDATE public.analyses SET credits_refunded_at = pg_catalog.now() WHERE id = p_analysis_id;
  RETURN true;
END;
$$;

-- Application servers authenticate the user and call with their service key.
-- End users cannot choose arbitrary user or analysis ids through these RPCs.
REVOKE ALL ON FUNCTION public.create_analysis_with_credit(uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_analysis_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_analysis_with_credit(uuid, text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_analysis_credit(uuid) TO service_role;

CREATE INDEX IF NOT EXISTS idx_analyses_refund_due ON public.analyses (created_at)
  WHERE status = 'failed' AND credits_reserved_at IS NOT NULL AND credits_refunded_at IS NULL;

COMMIT;
