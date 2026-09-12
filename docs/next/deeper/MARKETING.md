# A market test built around completed work

Proposed strategy, 12 September 2026. No campaign, recruitment, outreach, pricing offer or payment collection has been launched. Public research supports trying this proposition; it does not establish conversion, retention or willingness to pay. See the [demand ledger](demand-ledger.json) and [competitive comparison](competition.md).

## Customer and triggering moment

Start with a Mac user who already uses Codex or Claude Code and has an active project. They discover a useful AI tool, repo, workflow or design interaction and want to try it today. Their immediate obstacle is finding the real resource, understanding what matters, checking compatibility or completing setup.

The segmentation question is behavioral: **“Show us the last thing you actually tried to use after seeing it online.”** It is more useful than “Would you like to chat with your saves?” A person with thousands of untouched saves and no immediate goal may like the idea without becoming a retained execution user.

The engineering starts on Mac; research does not demonstrate that most buyers prefer Mac. Automation practitioners and AI-media creators are adjacent cohorts. Record their needs separately rather than pooling incompatible hardware and app requirements into the first release.

## Position and message

**Headline:** Saw it. Make it work.

**Supporting line:** Drop an AI post. Find what matters. Try it in your project.

**First useful suggestions:** Find the resource · Explain what matters · Try it here.

Use “Is this useful for my project?” when the source describes several tools or a concept. Do not make a giant to-do list from every save. A clear explanation or a well-supported decision to skip a tool is also a useful result.

The proof is a real sequence: the source moment, the exact recovered resource, the current prerequisite decision, the action, and the openable result. A polished phone-to-agent-to-result animation should reinforce that sequence. Record the demonstration from the working app. Until the import/action paths are working, the CTA is a private-pilot invitation, not an advertised promise of universal execution.

Avoid claims such as “any link works,” “never misses a frame,” “human-level understanding of every millisecond,” “unlimited Astra,” or “one click builds anything.” These claims are not supported. Say exactly which source types and action classes the release has passed. Keep limitations close to the input/action where they matter, without filling the landing page with implementation details.

## Three demonstrations worth producing

| Demonstration | What the viewer sees | What must actually be checked |
| --- | --- | --- |
| A repo only appears on screen | Share the Reel, ask for the repo, open the source moment and official destination, try its small demo. | Exact post; visible identity; current repo; successful local result. |
| A tutorial's setup no longer works | The agent spots version/environment differences, uses current official instructions, runs the example in a chosen workspace. | Correct adaptation; reproducible check; no unrelated project changes. |
| A design interaction worth adapting | Ask how the effect works; create an original version in the user's project and show the result. | Visible behavior matched to the actual goal; preview exercised; source attribution. |

Show total elapsed time, user interventions and provider usage. Include a failure/recovery example. A successful demo selected from many failed imports must not be presented as a reliability rate. A resource never revealed in the source cannot be advertised as recovered; an inferred replacement must be labeled.

## Distribution experiments

These are prioritized hypotheses, not campaigns already performed.

1. **Agent-native distribution.** Publish an inspectable evidence skill/MCP and a small reproducible example for existing Codex/Claude users. Its job is to provide better source context and checked resource identity. Measure whether users bring a second real source and reach a useful outcome. Repository stars and installs alone are weak signals.
2. **Creator-assisted demonstrations.** Work with willing AI educators on a “Try this example” resource page, preserving attribution and the original destination. The creator gets more successful viewers and potentially fewer setup questions. Test that benefit before assuming creators will distribute it. No partnership has been contacted or secured.
3. **Problem-specific demonstrations.** Share genuinely useful breakdowns of an AI workflow in communities where participation is welcome. Invite people with an actual current task, not everyone who saves posts. Do not scrape commenters into an outreach list or automatically post promotional replies.

Paid broad awareness ads come after repeated success and payment. Search demand, channel acquisition cost and a top-down market size have not been measured. Content can reveal which problem attracts serious attempts, but views should not be converted into a fictional revenue forecast.

## Pilot and comparison protocol

Recruit ten qualified Mac users once the bounded workflow is testable. Collect two distinct recent references/tasks from each, with consent to observe. Record their current workaround and chosen result before showing ContextDrop's suggestions. Include Reels, photos/carousels, tutorial videos and concept/roundup content without forcing the same action on all of them.

Compare understanding tasks with Reelnest or their usual content reader; compare execution tasks with Gemini plus their existing coding agent and the strongest simple skill baseline. Providers need the same accessible source material. Record fresh imports separately from cached imports and user-supplied files. Never count uploading a downloaded copy as success for a failed link importer.

Counterbalance tool order across people and task sets. Repeating the exact task teaches the answer, so use matched task pairs for effort comparisons and an independent assessor for output quality where feasible. This is a small exploratory study, not a statistically powered trial. Do not claim “2× faster” from a single demonstration or pooled incompatible jobs.

Track the event chain:

`eligible_link_submitted → correct_complete_import → supported_useful_answer → action_chosen → checked_result → voluntary_second_task → paid_pilot`

An action is optional. Also record `informed_decision` when the user wanted evaluation or explanation; do not penalize the app for correctly avoiding an unnecessary install. Distinguish model-reported success from a real artifact or observed state. Failed imports and abandoned attempts stay in denominators.

| Metric | Definition |
| --- | --- |
| Import success | Exact intended post and all eligible assets, ordered correctly, divided by attempted eligible imports. |
| Answer support | Audited factual statements with working evidence, plus exact resource accuracy. |
| User effort | Active user time and manual repair/interventions; background elapsed time separately. |
| Useful outcome | User's predeclared goal met, with independent task-appropriate checks where actionable. |
| Cost | Every attempt, reread, failed run and retry; unknown charges stay unknown until reconciled. |
| Repeat use | A voluntary second useful task using the person's own source during two weeks. |
| Payment | An accepted paid pilot after use, separately distinguished from stated willingness or a waitlist signup. |

Keep the canonical commercial decision thresholds: six of ten voluntarily return and three accept a paid pilot after use. These thresholds are deliberately small-stage decisions, not product-market-fit proof. Also inspect each failure qualitatively: did capture break, was the answer unsupported, did execution fail, did the user already have an easier route, or was the source never worth acting on?

## Pricing hypothesis and economics

For technical private-pilot users, test **$19/month for the product with the user's own model usage**. Present the usage arrangement and expected cost clearly before offering it. This is an unvalidated offer hypothesis. Do not assume API-key setup is acceptable to all customers; count onboarding drop-off and support time.

After measuring usage, compare a managed plan with a defined reading allowance and separately bounded execution. Avoid an unlimited plan and avoid making the customer subscribe to a catalog of services. One optional metered acquisition fallback can remain invisible infrastructure rather than a separate user subscription. Do not offer lifetime unlimited cloud processing.

The base scenario in the [cost model](cost-model.json) estimates $23.57/month with Lite or $27.09 with promotional Flash reading/chat, including hypothetical support/relay and 12 Astra actions. It excludes marketing, payment fees, taxes and engineering. A $29 all-inclusive promise would leave little room for those costs and heavier users. Measure the action-cost tail before bundling credits; do not price from average model-token cost alone.

## What changes the business decision

- **Strong repeat adaptation and payment:** expand the polished Mac companion and the successful action classes.
- **Useful evidence, but users prefer their agent UI:** sell or distribute the content reader as an integration; keep capture simple.
- **Mostly rediscovery with price resistance:** reassess a lightweight capture/search product against established competitors.
- **Direct Gemini/Codex is just as effective:** improve the specific measured gap or stop the redundant interface work.
- **Good demos, poor imports or high support:** fix acquisition/onboarding before marketing more aggressively.
- **People save more but never use it again:** do not interpret increased storage as success for the original execution thesis.

The next scarce resource is observed behavior, not another subscription to a research database. The current evidence is enough to choose a small experiment and insufficient to justify a broad launch claim.
