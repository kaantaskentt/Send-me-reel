# Memory-First Personalization Plan for ContextDrop

Date: 2026-05-01

This is a more aggressive plan than `LLM_WIKI_MULTI_USER_IMPLEMENTATION_PLAN.md`.

The previous plan treated the LLM-wiki layer as a safe sidecar: useful for chat, but mostly outside verdict generation and content decisions. That is architecturally safe, but it does not fully deliver the product vision: ContextDrop should feel like it understands the user better every day.

This plan keeps the product what it is:

- user sends/saves a link;
- ContextDrop analyzes it;
- user gets a small useful output;
- user can revisit, chat, act, or let it go.

But it changes the decision center. Instead of generic content classification first and personalization later, ContextDrop should make a user-aware decision from the start of the verdict layer.

## 1. Diagnosis

The current system is over-defensive.

It uses LLMs, but mostly in tightly bounded slots:

- scrape and transcribe;
- classify content type;
- identify subject;
- research subject;
- generate a formatted verdict;
- produce an action lane.

This protects against hallucination and over-personalized cringe, which are real risks. But it also means the user’s long-term context is mostly absent from the moment where the product makes its most important judgment:

> What should this saved thing become for this specific person?

Right now, that decision is mostly content-shaped, not user-shaped.

The app is therefore split between two ideas:

- **Algorithmic ContextDrop:** a careful pipeline that classifies content and emits a verdict.
- **Agentic ContextDrop:** a thinking partner that learns the user and helps them process saved intent.

The author’s stated vision points toward the second, but the current architecture mostly implements the first.

## 2. Product Thesis

The product should not merely answer:

> What is this content?

It should answer:

> What should this content become in this user’s life?

Possible answers:

- a tiny thing to try;
- a thing to buy later;
- a recipe/place/practice to save;
- a question to discuss;
- a thought to keep;
- a pattern that belongs to a broader project;
- nothing, just a watch.

That decision cannot be made well from content alone. It needs:

- the source content;
- user’s explicit context;
- user’s history of saves;
- what they actually try;
- what they star;
- what they repeatedly ask about;
- what they ignore;
- what kinds of actions overwhelm them;
- what examples and language make sense for them.

That is exactly what the LLM-wiki layer should provide.

## 3. Core Change

Replace the current "content classifier drives verdict route" model with a **Personal Relevance Decision Maker**.

Current:

```text
content -> contentClassifier -> content_type/action_lane
        -> maybe subject research
        -> verdictGenerator
```

Proposed:

```text
content -> retrieve user's wiki/context
        -> single LLM call with two internal stages:
             1. source_understanding
             2. personal_relevance_decision
        -> specialized renderer
        -> wiki update
```

The old classifier may remain as a fallback or a sub-signal, but it should stop being the central router.

## 4. What To Keep

Keep the parts that protect input quality and produce reliable raw material:

- URL routing.
- Scraping and fallbacks.
- Download handling.
- Transcription.
- Frame extraction.
- Visual analysis.
- Quality gate.
- Subject extraction and subject research, but only as source-enrichment tools.
- Existing `analyses` table as the raw immutable-ish record.
- Telegram and web entry points.
- Dashboard/archive basics.
- Chat threads/messages.

These are not the problem. They are the input layer.

## 5. What To Redo

### 5.1 Replace `contentClassifier` as the decision owner

The current classifier asks:

> What kind of content is this?

That is useful but insufficient. The real decision asks:

> Given this user, this content, and their history, what is the right treatment?

The current `contentClassifier` can be demoted to:

- an input feature;
- a fallback when no personal context exists;
- a safety check for obvious cases like recipe/place/product/exercise;
- an eval/debug label.

It should not be the main product brain.

### 5.2 Replace verdict generation with one call, two internal stages

Today `verdictGenerator` mixes:

- content description;
- action decision;
- tone;
- output formatting;
- anti-hallucination policy.

Replace it with a single structured reasoning call that has two internal stages:

1. **Source Understanding**
   - Summarizes what the content actually contains.
   - Must be filled using only source content and source enrichment.
   - Must not use the user wiki.
   - Output is structured JSON.

2. **Personal Relevance Decision**
   - Reads the just-produced source understanding plus retrieved personal wiki.
   - Decides treatment:
     - `try_now`
     - `save_for_later`
     - `shop_later`
     - `chat_about`
     - `remember_as_concept`
     - `connect_to_project`
     - `just_watch`
   - Explains why this treatment fits the user.
   - Selects what memory pages should be updated.

This should usually be one LLM call, not two separate calls. The prompt should force the model to complete the source-grounded section first, then complete the user-aware decision section. That keeps the reasoning cohesive while preserving the boundary between "what the content says" and "what this means for this user."

3. **Renderer**
   - Converts the decision into the compact user-facing verdict.
   - Enforces voice, brevity, and output format.
   - Does not decide meaning.

This makes the system more agentic without giving the renderer too much freedom.

### 5.3 Replace static action lanes with personal treatment lanes

Current `action_lane` values:

- `open_it`
- `shop_this`
- `save_for_later`
- `chat_about`
- `just_a_watch`
- `the_takeaway`

These are content-derived. Keep them only as possible outputs, but add user-aware treatment:

- `try_now`: this fits a current project/goal and has a low-friction next step.
- `park_for_project`: useful, but not for today; attach to a known project/topic.
- `ask_followup`: needs user context before any action is honest.
- `compare_to_past`: similar to things they saved/tried before.
- `avoid_for_now`: matches a pattern the user is trying to stop.
- `just_watch`: no action, no guilt.
- `remember`: important idea worth keeping, not doing.

This is closer to the product’s emotional promise.

## 6. The LLM-Wiki Layer Becomes Product Infrastructure

The wiki should not be a passive archive. It should become the memory substrate used by the decision maker.

### 6.1 Wiki pages the AI uses

Minimum pages per user:

- `user/profile`
- `user-now/`
  - realistic picture of the user today;
  - current fluency by major topic;
  - knowledge gaps;
  - overwhelm level;
  - action capacity;
  - recurring failure modes;
  - what is probably too basic, too advanced, or at the edge of usefulness right now.
- `user-goals/`
  - where the user wants to be;
  - current learning goals;
  - active life/work/project goals;
  - desired skills;
  - explicit commitments and things they want to stop doing.
- `user/preferences`
- `user/current-projects`
- `user/action-style`
- `user/patterns-to-avoid`
- `user/recent-intents`
- `topics/*`
- `tools/*`
- `projects/*`
- `concepts/*`
  - one page per meaningful concept the user encounters;
  - includes the user's current understanding level, not just a generic definition.
- `themes/*`
  - broad clusters that prevent unrelated saves from collapsing together;
  - examples: `themes/ai-agents`, `themes/recipes`, `themes/fitness`, `themes/restaurants`, `themes/buying-decisions`, `themes/career`, `themes/productivity`.
- `sources/*`
  - not full duplicated transcripts;
  - pointers/provenance to saved analyses, chats, verdicts, and subject research.
- `open-questions/*`

The user may inspect/edit/delete these later, but the primary consumer is the AI.

The key page group is `user-now/`. It is not a motivational profile or a resume. It is the assistant's best evidence-backed operating picture of the user today:

- what the user already seems fluent in;
- what they misunderstand or keep asking about;
- what they can probably act on without setup;
- what they find overwhelming;
- which areas are below their current level and likely boring;
- which areas are too far above their current level and need scaffolding;
- which areas are at the border of their understanding and worth paying attention to.

`user-goals/` is separate from `user-now/` because the product needs both:

- where the user is today;
- where the user wants to go.

Most personalization errors come from confusing those two.

### 6.2 What the wiki must learn

The compiler should track:

- subjects the user saves repeatedly;
- content categories they act on vs ignore;
- tools/topics tied to current projects;
- questions they keep asking;
- concepts the user appears fluent in;
- concepts where the user has knowledge gaps;
- concepts that are probably below the user's current competence level;
- concepts that are probably above the user's current competence level;
- concepts that are on the user's learning edge;
- whether actions are usually too large;
- whether they prefer examples, commands, analogies, summaries;
- whether they tend to save and not act;
- how overwhelmed the user appears in different domains;
- what they mark tried;
- what they star;
- what they set aside;
- what they ask the assistant to explain again.

The compiler should not store all saved content in one undifferentiated pile. AI-related videos, recipes, products, places, fitness drills, buying decisions, and career advice should land in separate thematic spaces. Cross-links are allowed, but default organization should preserve domain boundaries.

### 6.3 Memory should be evidence-bound

The system must distinguish:

- explicit user facts: "I am a medical student";
- behavior signals: "User often saves AI research tools";
- weak hypotheses: "May prefer low-setup tools";
- external facts: "Mem0 is a memory layer";
- product decisions: "Last time, the assistant suggested trying X."

No private inference should become a confident fact without evidence.

## 7. New Runtime Flow

### Step 1: Analyze content as today

Keep scraping/transcription/visual/quality gate.

### Step 2: Retrieve personal wiki

Retrieve before the reasoning call:

- profile/preferences/action style;
- `user-now/*`;
- `user-goals/*`;
- current projects;
- related topics/tools;
- related concepts and the user's fluency level for those concepts;
- relevant themes, so recipes, AI tools, places, products, and advice do not get mixed into one memory bucket;
- saved source analyses related to the current content;
- similar saved analyses;
- recent tried/starred/set-aside signals;
- relevant chat memories.

If no useful memory exists, return an explicit empty result:

```json
{
  "has_personal_context": false,
  "reason": "new_user_or_no_related_memory"
}
```

### Step 3: Single call: source understanding + personal decision

New structured output:

```json
{
  "source_understanding": {
    "source_kind": "video|article",
    "main_subject": "...",
    "content_shape": "tool|recipe|place|argument|tutorial|story|product|exercise|other",
    "what_happens": "...",
    "claims": ["..."],
    "concrete_handles": {
      "urls": [],
      "tools": [],
      "prices": [],
      "steps": []
    },
    "possible_actions": [
      {
        "label": "...",
        "friction": "low|medium|high",
        "requires_setup": true,
        "grounded_in_source": true
      }
    ],
    "no_action_reason": null
  },
  "personal_relevance_decision": {
    "treatment": "try_now",
    "confidence": 0.78,
    "personalization_used": [
      {
        "wiki_page": "projects/med-school-research",
        "source": "explicit_user_statement",
        "how_used": "mapped tool to research workflow"
      }
    ],
    "user_facing_reason": "This fits the research-workflow thread you keep returning to.",
    "verdict_payload": {
      "description_angle": "subject_first",
      "action": "Try the paper summarizer on one paper already in your reading list.",
      "memory_connection": "research workflow",
      "attention_guidance": {
        "level_fit": "learning_edge",
        "pay_attention_to": ["how the tool handles citations"],
        "skim_or_ignore": ["generic AI productivity framing"]
      }
    },
    "wiki_updates": [
      {
        "page": "topics/ai-research-tools",
        "operation": "append_source"
      }
    ],
    "fallback_used": false
  }
}
```

This replaces the current broad `contentClassifier` as the core structured input. The old classifier can still populate `source_understanding.content_shape` or check it.

Input:

- source content and source enrichment;
- retrieved wiki pages;
- current user note;
- current stance/intention/pattern_to_stop;
- safety rules.

Rules:

- Fill `source_understanding` first using only source content. Do not let user memory change what the source says.
- Fill `personal_relevance_decision` second using `source_understanding` plus wiki context.
- If the wiki retrieval is irrelevant, make a generic decision.
- If personalization is weak, do not pretend.
- If content is unrelated to the user’s known interests but still useful, describe it plainly.
- If the user is trying to stop saving-without-doing, bias toward `just_watch` unless the action is truly tiny.
- If the user repeatedly acts on a category, be more willing to suggest `try_now`.
- Decide whether the content is below, above, or at the user's current understanding level.
- If content is below the user's level, say so implicitly through treatment: `just_watch`, `skim`, or no action.
- If content is above the user's level, either scaffold it or park it for later; do not pretend it is immediately actionable.
- If content is at the user's learning edge, identify the one or two parts worth attention and let the rest be skimmed.
- If only part of the content is relevant, the verdict should focus on that part rather than summarize everything equally.

### Step 4: Render compact verdict

The renderer receives the decision and formats it.

Possible output:

```text
📍 Mem0 is a memory layer for AI agents. This one connects to the agent-memory thread you've been circling.

🌱 Try this once
Use it on one tiny recall task in your current Claude Code experiment.
```

Or:

```text
📍 This is a restaurant list, not something to act on today.

💾 Save for later
Add it to your weekend list if the location is near you.
```

Or:

```text
📍 Per the creator: saving more tools will not help if none enter your actual work.

🍵 Just a watch
```

## 8. Product Behavior Changes

### New user

For a new user with no wiki:

- system behaves similarly to current product;
- uses source understanding and generic action safety;
- asks fewer assumptions;
- begins building wiki pages.

### Returning user

For a returning user:

- verdicts mention relevant context when useful;
- action lines become tailored;
- "chat about this" becomes specific to their projects/questions;
- repeated topics get connected;
- the assistant can say "this is another one in the same cluster as..."
- the assistant can decide that something is too basic, too advanced, or exactly at the user's learning edge;
- the assistant can say what to pay attention to and what can be skimmed.

### User with bad pattern

If the user often saves and never acts:

- fewer forced actions;
- more `just_watch`, `remember`, or `park_for_project`;
- when action appears, it must be very small and context-specific.

### User with active project

If a user repeatedly connects content to a project:

- more project-specific actions;
- wiki pages accumulate project-relevant tools, questions, decisions;
- chat starts from the project context.

### User discussing saved content in chat

Chat should not only know the current analysis. It should retrieve:

- the user's `user-now/` and `user-goals/` context;
- relevant concept pages with fluency/knowledge-gap notes;
- relevant thematic folders;
- saved analyses related to the current question;
- prior chats about the same topic;
- previous verdicts/actions tied to the same source cluster.

This lets chat answer questions like:

- "Have I saved something like this before?"
- "Is this worth my time?"
- "What part of this should I actually pay attention to?"
- "Explain this at my current level."
- "How does this connect to what I was trying to learn?"
- "What did I already ask about this?"

The chat surface is where the wiki should feel most obviously alive.

## 9. What To Throw Away or Freeze

### Throw away as central architecture

- Current idea that `content_type` should drive the whole verdict.
- Static action-lane-first routing.
- Generic "what is this subject?" prompt as the default for all content.
- User-blind chat as a long-term design.

### Keep but freeze

- Current classifier output columns can stay for analytics/debug.
- Current prompt paths can stay as fallback for new users/no memory.
- Existing verdict string format can stay for UI compatibility.

### Rewrite significantly

- `src/services/verdictGenerator.ts`
  - split into source understanding, decision, renderer.
- `src/services/contentClassifier.ts`
  - demote to helper/fallback, or replace with `sourceUnderstanding.ts`.
- Chat route prompt
  - retrieve personal wiki every turn and use it as a first-class input.
- Dashboard detail view
  - show why a recommendation was made when personal context was used.

## 10. Suggested New Modules

### `src/services/personalWiki/retriever.ts`

Same-user retrieval over wiki pages, sources, and related analyses.

### `src/services/personalDecisionMaker.ts`

The new core decision layer. It should make one structured LLM call that returns both `source_understanding` and `personal_relevance_decision`.

### `src/services/verdictRenderer.ts`

Small formatter. No deep reasoning.

### `src/services/personalWiki/compiler.ts`

Updates pages after analyses, chats, state changes.

### `src/services/personalWiki/guards.ts`

Validates same-user boundaries and confidence/source requirements.

## 11. Database Changes

Use the wiki schema from the earlier plan, but add decision records.

### `analysis_decisions`

Store exactly why a verdict was personalized.

Columns:

- `id uuid primary key`
- `user_id uuid not null`
- `analysis_id uuid not null`
- `source_understanding jsonb not null`
- `retrieved_wiki_pages jsonb not null`
- `decision jsonb not null`
- `personalization_level text not null`
- `model text`
- `created_at timestamptz not null default now()`

`personalization_level`:

- `none`
- `weak`
- `moderate`
- `strong`

This table is important for debugging trust. If the assistant says something personal, we need to know why.

## 12. Guardrails

Personalization must be bounded, not vague.

Rules:

- Do not use wiki memory unless retrieved pages are relevant to the current content or user note.
- Do not mention personal context just to sound personal.
- Do not infer sensitive traits.
- Distinguish explicit facts from behavioral hypotheses.
- Always allow a generic fallback.
- Record personalization evidence in `analysis_decisions`.
- If the system cannot explain why it personalized, it should not personalize.

Bad:

> This is perfect for your workflow.

Better:

> This connects to the research-automation thread you've asked about twice.

Best when unsure:

> This is useful on its own; I don't have enough context to tie it to your projects yet.

## 13. How This Solves the Product Contradiction

The current system tries to make LLMs reliable by turning them into deterministic pipeline components.

This plan keeps deterministic boundaries where they matter:

- source ingestion;
- user isolation;
- provenance;
- output rendering;
- fallback behavior.

But it restores agentic flexibility where it matters:

- deciding what the content means for this user;
- connecting new saves to old context;
- adapting action size;
- knowing when not to assign homework;
- learning from behavior.

That is the right division.

## 14. Migration Strategy

### Phase 1: Build wiki and source understanding, no product change

- Add wiki tables.
- Add source snapshots.
- Add single-call decision maker in dry-run mode.
- Store `source_understanding` and `personal_relevance_decision` outputs but keep current verdict behavior.
- Backfill internal users.

### Phase 2: Add decision maker in shadow mode

- Run the single-call Personal Relevance Decision Maker after current verdict.
- Store `analysis_decisions`.
- Do not show output.
- Compare:
  - current verdict;
  - memory-first decision;
  - whether personalization was justified.

### Phase 3: Use decision maker for chat first

- Chat retrieves wiki and decision history.
- Chat becomes explicitly memory-aware.
- Validate that users notice useful memory, not creepy memory.

### Phase 4: Use decision maker for verdict action line

- Keep current source description.
- Replace only action/treatment line with memory-first decision.
- This is the safest visible change.

### Phase 5: Replace full verdict route

- Use single-call source understanding + personal decision + renderer for the whole verdict.
- Keep old `verdictGenerator` as fallback.
- Gradually roll out by user allowlist.

### Phase 6: Retire old classifier as router

- Keep `content_type` for analytics/debug.
- Stop using it as the primary branch.
- Let personal decision maker choose treatment.

## 15. Evaluation Plan

Create eval sets with real user histories, not isolated content.

Each eval item should include:

- user profile/wiki pages;
- recent saves;
- tried/starred/set-aside signals;
- current content;
- current user note;
- old verdict;
- new decision;
- human judgment.

Score:

- Is the source description accurate?
- Is personalization justified?
- Is the action smaller/better than generic?
- Does the assistant avoid shame?
- Does it avoid creepy overreach?
- Does it correctly say no action when appropriate?
- Does it connect to prior context only when useful?

This cannot be evaluated only with content fixtures. The whole point is user-specific behavior.

## 16. User Experience Requirements

If personalization becomes central, the UI needs trust surfaces.

Add:

- "Why this?" explanation on personalized verdicts.
- "Not relevant to me" feedback.
- "Remember this" / "Don't remember this" controls.
- Personal memory page in settings.
- Delete/export memory.
- Correction flow: "Actually, I use this for X."

The user does not need to browse a full wiki every day, but they must be able to inspect and correct the model.

## 17. Risks

### Risk: creepy personalization

Mitigation:

- Use explicit evidence.
- Do not mention weak hypotheses.
- Show "why this" provenance.

### Risk: worse verdict reliability

Mitigation:

- Keep source understanding user-blind.
- Keep renderer strict.
- Roll out action-line replacement before full verdict replacement.

### Risk: high cost/latency

Mitigation:

- Cache wiki retrieval summaries.
- Run decision maker with compact pages.
- Shadow mode before production.
- Keep old path fallback.

### Risk: wrong user memory

Mitigation:

- Store evidence and confidence.
- User correction flow.
- Periodic wiki lint.
- Avoid turning one behavior into a permanent trait.

### Risk: overbuilding

Mitigation:

- Build the decision record and chat usage first.
- Only replace full verdict after evals prove value.

## 18. Recommended Bold Decision

Do not build a giant hidden wiki first and hope it matters.

Build the smallest memory-backed decision loop:

1. retrieve 3-5 personal wiki facts/pages;
2. make one structured LLM call with `source_understanding` and `personal_relevance_decision`;
3. decide treatment inside that call;
4. render action/treatment line;
5. record evidence;
6. update wiki after the interaction.

If that loop makes the action line obviously better, expand it.

If it does not, the full wiki will not save the product.

## 19. What The Product Becomes

The product remains simple from the user side:

> Send a link. Get the smallest useful interpretation.

But internally it changes from:

> classify content, generate generic verdict

to:

> understand content, retrieve user memory, decide what this should become for this person, respond, learn.

That is the actual LLM-wiki adaptation for ContextDrop.

Karpathy's wiki helps a human think with sources.

ContextDrop's wiki should help the AI think with the user's history.

## 20. Bottom Line

If ContextDrop wants to be a better bookmark analyzer, keep the current classifier architecture and polish it.

If ContextDrop wants to feel like a thinking partner for saved content, the classifier cannot remain the product brain.

The product brain has to become memory-aware.

The safe path is not to inject memory everywhere at once. The safe path is to move decision-making into a new memory-backed layer, run it in shadow mode, then let it replace the least risky visible part first: the action/treatment line.
