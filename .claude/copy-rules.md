# Copy rules

Authoritative banned-words list for user-facing strings, mirrored from
strategy.md §7.1. The pre-commit hook (`.husky/pre-commit` /
`scripts/check-copy.sh`) reads from this list. Update here, not in the script.

## Hard banned in user-facing copy

These create the wrong emotional axis (rating, hype, urgency, hustle):

- `Worth your time`, `Skim it`, `Skip` — content rating axis is retired
- `actionable`, `key takeaway`, `pro tip`, `bottom line`, `deep dive`
- `valuable insights`, `great content`, `highly relevant`, `I recommend`
- `consider exploring`, `insightful for anyone`, `the post highlights`
- `behind` (only allowed as "you're not behind"), `ahead`, `stay ahead`,
  `fall behind`, `keep up` — catch-up framing
- `master`, `level up`, `10x`, `supercharge`, `unlock`, `elevate`,
  `optimize`, `leverage` — productivity/hustle verbs
- `powerful`, `robust`, `incredible`, `cutting-edge`, `comprehensive`,
  `game-changer`, `revolutionary`, `exciting`, `fascinating`, `innovative`
- `driven`, `ecosystem`, `landscape`, `utilize`, `streamline`,
  `sweet spot`, `on-brand`, `legit`, `solid find`, `workflow`,
  `big if`, `huge for`, `syncs with`, `useful find`, `worth bookmarking`

## Always-allowed phrasings (the voice)

The voice is calm, slow, MyMind-coded. These phrases (or variants) should
appear in welcome / empty / onboarding strings:

- `no rush`
- `no pressure`
- `one sip` / `one small thing` / `one step`
- `take your time`
- `you're not behind` (only allowed use of "behind")
- `no homework today`

## Hook scope

The hook scans these globs in staged changes:

- `src/bot/**/*.ts`
- `src/pipeline/orchestrator.ts`
- `src/services/verdictGenerator.ts`
- `web/src/components/**/*.tsx`
- `web/src/app/**/page.tsx`

It is a **soft warning** — it prints the offending lines and exits 1 in
strict mode (set `CD_COPY_STRICT=1`), but otherwise prints and exits 0
so it doesn't block commits. The default is informational. The team
reviews. Tighten when the codebase has shaken in.
