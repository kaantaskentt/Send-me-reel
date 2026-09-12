# ContextDrop Next — design brief

Status: design proposal, 2026-09-12. This document defines the new experience; it is not a claim that the experience is implemented or verified. No paid asset generation or new UI implementation was performed for this brief.

## The feeling

Someone sends an interesting post and immediately feels: **“I can use this.”** The product should feel composed, direct, and capable. Its best visual is a real piece of content turning into an actual result. The interface must make that transition understandable before it makes it spectacular.

### References and interpretation

The supplied [Refero style collection](https://styles.refero.design/) and [Apple-style reference](https://styles.refero.design/style/da7e5084-9e5d-4eb2-bb10-4c2d7733a56e), accessed 2026-09-12, suggest generous negative space, strong typography, one prominent subject, restrained controls, and a single clear action color. Use those principles as inspiration, not a page template. The reference is an interpretation of an Apple product page, not an authoritative accessibility specification; its generated tokens and code should not be copied wholesale.

Apply the installed [apple-design skill](../../.agents/skills/apple-design/SKILL.md) to interaction behavior: immediate feedback, spatial continuity, interruptible transitions, system typography, and reduced-motion alternatives. The decisions below are specific to ContextDrop.

## Landing page

### Exact copy

**Wordmark:** ContextDrop

**Headline:** Put your saved ideas to work.

**Supporting sentence:** Drop a link. Ask about it. Make something with it.

**Primary CTA:** Try a link

**Small availability label, only when accurate:** For Mac · Early access

The primary CTA moves directly to the link field. Do not interpose a product tour, agent selection, workspace setup, or sign-up wall before explaining what will happen. If an account is required for a provider call, ask at that boundary with the submitted link preserved.

For an unconnected design prototype, replace the primary CTA with **Preview the idea** and display **Design concept** next to the wordmark. A prototype must not accept a link and pretend to process it. “Try a link” becomes appropriate only when it reaches the real working source flow.

### Composition

One quiet dark stage. At desktop widths, put the headline in the upper left of a centered 1,200px composition, with the CTA directly beneath it. Below and slightly to the right, a large single visual carries the story. Leave real space around the subject. The headline should remain readable even if the visual never loads.

Use a simple navigation row: wordmark left, a plain **Open app** link right for existing users. Avoid feature/pricing/company link clusters in the hero. A compact factual footer can contain privacy, support, and actual availability.

Below the hero, one light section shows a real source-to-result example once available. Its title is **From a post to your project.** Show the source, the question, and the resulting artifact with the checks that were actually run. Do not add a six-card feature grid, rotating testimonials, invented customer logos, or model-name badges.

### Phone → understanding → useful result

Use a three-part composition with a visible direction of travel:

1. **Phone:** a slim, front-facing phone silhouette containing one real permitted source thumbnail. It communicates where the idea starts, rather than advertising a not-yet-shipped phone application.
2. **Understanding:** a small central glass tile with a restrained, etched brain outline. A single evidence card emerges beside it: a legible detail from the source and its timestamp or slide number. This makes the “brain” concrete.
3. **Result:** a small real browser preview, file, or repo window on the right. It should show the relevant working result, not an abstract cloud of terminal text.

The source card travels from the phone toward the center; one relevant detail is highlighted; the useful result is revealed. A thin connector is enough. Avoid flying platform logos, particle tunnels, neon brains, endless orbits, and simulated typing.

Use real captured app screens for the result as soon as the underlying journey passes acceptance. Until then, use plainly labeled geometric placeholders: **Source**, **Evidence**, **Your result**, accompanied by **Illustration of the intended flow**. Never place a green completion mark on an illustrative output. A rendered or HiggsField-generated hardware/brain visual may be decorative later; it must not fabricate the product UI or completed task.

On mobile, the story stacks vertically with the headline, CTA, phone, evidence, and result all in normal scroll order. No sideways scrolling or pinned scroll choreography is necessary. The link field must be reachable before the visual finishes.

## Three primary app surfaces

### 1. Drop

This is the default empty state and the destination of the landing CTA.

- Heading: **What caught your attention?**
- Link field label: **Content link**
- Placeholder: **Paste a post, video, or page**
- Primary action: **Open content**
- Quiet secondary control: **Choose a file**

The field validates inline without losing the typed URL. Beneath it, show only the currently supported source types, not a universal-platform promise. A short recent-items list may appear after prior use; an empty user sees no analytics, agent inventory, library graph, or sample tasks presented as their own.

An optional question can be typed with the link. It is never mandatory. The user should be able to send a link first and decide what they want after seeing it.

### 2. Conversation

The source, evidence, chosen action, progress, and result live in **one persistent conversation**. No mandatory plan dashboard or separate execution wizard.

The initial header contains the source thumbnail, title, creator when known, and a link to the original. It remains compact while scrolling. A source panel opens inline beside the conversation on wide screens; on narrow screens it becomes an accessible sheet. Opening evidence preserves chat position and draft text.

The first response should usually contain:

- One or two sentences about what the content contains.
- The most useful finding or an honest indication of missing information.
- Up to three contextual suggestions, such as **Find the repo**, **Is this useful for my app?**, or **Explain the technique**.

These labels are examples of possible suggestions. The model should choose them from the actual source, rather than attach build/install buttons to every post.

#### Evidence in the conversation

Place a small evidence chip beside the claim: **Shown at 1:24**, **Slide 4**, or **From the caption**. Selecting it reveals the exact saved image, clip, or text passage. A resource result shows the observed spelling, the verified destination, and any unresolved identity mismatch in plain language.

Use **I found a likely match** when identity is uncertain. Use **The source does not show the full prompt** when it does not. Do not hide uncertainty in a hover tooltip or pretend missing content was recovered.

Detailed coverage is available under **What was checked**. Explain the actual evidence collected in ordinary language; keep frame rates, tool JSON, internal IDs, and token budgets in developer diagnostics. Never label an overview as “every frame watched.”

#### Choosing and running an action

An action recommendation is a compact block in the same thread:

> **Try this locally**
>
> Create a separate project and get the demo running with Codex.
>
> New project · Downloads required
>
> **Start** · Change

This is an example structure, not a default command. Replace its title, destination, effects, and harness with the actual task. **Change** edits the few material choices inline. Use an existing selected project when requested; do not silently switch to it. The user should not have to approve a long model-authored plan just to ask a question.

After Start, the block becomes a compact live status in place. Show factual progress events such as **Reading the repository**, **Installing dependencies**, or **Checking the preview** only when those events are happening. Keep the composer usable so the user can clarify or redirect. Provide a persistent **Stop** control for the active operation. The backend must acknowledge cancellation; a changed button label alone is not a stop.

A login or other necessary user step appears as **Your turn** with the exact page or control to use and a brief reason. Do not repeatedly request approval for routine steps already included in the chosen task. Additional irreversible or out-of-scope changes get a specific decision at that moment.

#### Result in place

The final result card contains the artifact or destination, a primary **Open result** action, and a short line describing what was checked. It distinguishes:

- **Ready to run:** prepared instructions/context, execution has not started.
- **In progress:** work is active.
- **Needs you:** a concrete user step is pending.
- **Finished, not checked:** the process ended but the requested outcome remains unverified.
- **Verified:** task-specific evidence demonstrates the requested result.
- **Stopped** or **Could not finish:** accurate terminal states with preserved partial work and a useful next step.

Use the same source and conversation identity throughout retries and execution. Never make the user paste the video again merely because a task needs clarification.

### 3. Library

The library is a quiet searchable list of prior content and outcomes, not the primary screen. Each row contains source thumbnail, title, a short useful finding when available, and recent activity. Search can find the thing remembered visually or by purpose. Opening a row returns to its conversation, evidence, and result.

Do not require manual folders, categories, workflow names, or tags at save time. Optional project association and deletion remain available. Do not turn every unread item into a guilt-inducing red badge.

Settings are an accessory sheet from the account menu, not a fourth primary surface. Put connected model/provider accounts, execution harness, privacy/export, and advanced controls there. Ask for a connection only when the selected action needs it, and return to the original conversation afterward.

## Visual system

These are proposed original tokens, subject to browser verification. They are not copied from the reference stylesheet.

| Role | Proposed value | Use |
| --- | --- | --- |
| Landing stage | `#090A0C` | Dark showroom behind the one hero visual |
| Workspace canvas | `#F6F7F9` | Calm light default for reading source evidence |
| Surface | `#FFFFFF` | Conversation and evidence surfaces |
| Main text | `#202329` | Content and controls on light surfaces |
| Secondary text | `#606773` | Readable supporting labels |
| Primary action | `#0965D0` | Main action and focus identity |
| Link on dark | `#79B8FF` | Readable links on the landing stage |
| Hairline | `#DCE0E6` | Subtle structure, never the only focus indicator |
| Warning text | `#8A4B00` | Uncertainty or a needed user step, paired with words |
| Success text | `#176B3A` | Verified result, paired with its check evidence |

Honor system appearance in the app. Dark mode uses tested semantic equivalents; do not invert screenshots, images, or video frames. The source's original colors are evidence.

Use `system-ui` with the platform's native font. Hero type scales approximately 42–76px, 600 weight, tight leading and modest negative tracking. App body text starts at 16px with comfortable leading; useful evidence text should not be squeezed into 11px captions. Use 8/12/16/24/32/48px spacing as a small coherent scale, expressed in relative units where appropriate. Prefer 16px panel corners and 24px large media corners, with compact rounded buttons. Avoid a pill around every label.

Desktop conversation width should stay readable at roughly 700–760px. The optional evidence panel may use another 340–420px when space allows. At smaller widths it collapses rather than shrinking both columns. Maintain one page scroll context where possible; do not build nested tiny scrolling cards.

## Motion and accessibility

- Show button feedback immediately on press; commit the action on release. Never wait for an animation before submitting a link or making the next control available.
- Use brief, critically damped motion for expanding evidence and repositioning panels. Start from the current displayed position and permit interruption; reversal must not jump or wait for a previous animation.
- Open and close a panel along the same spatial path. Return keyboard focus to its trigger on close. Escape dismisses optional panels and dialogs, while an active task requires its explicit Stop control.
- Give the hero one short optional sequence and a static final state, with Replay available. Do not loop motion indefinitely or hijack page scrolling. Reduced motion replaces travel and scale with a static diagram or short fades.
- Respect reduced transparency and increased contrast. A translucent toolbar has a near-solid fallback; content readability must not depend on blur support.
- Keyboard access covers source submission, suggestions, evidence, action selection, cancellation, and result opening. Use native controls and meaningful accessible names. Sheets need correct dialog semantics and focus behavior.
- Use visible focus outlines, comfortably sized targets, and text labels with status colors. Validate text contrast, 200% zoom, screen-reader announcements, and reduced-motion behavior in the implemented browser flow.
- Announce meaningful stage changes politely; do not read every token or log line to a screen reader. Preserve typed text, focus, and scroll position during streaming and background updates.
- Recover gracefully from dropped connections: show reconnecting, keep the source and conversation, and reconcile actual job state before offering a retry. Never start a duplicate expensive run from an ambiguous refresh.

## Claim discipline

| Design concept | Launch claim allowed only with evidence |
| --- | --- |
| A phone sends a source toward a brain | Phone sharing really reaches the same source on the Mac |
| A brief detail becomes an evidence card | Actual source capture recovers the detail and the user can inspect it |
| A result appears on the right | The requested output was produced and the stated check passed |
| A source can be questioned | The questions are answered from that source, with truthful coverage and limitations |
| The agent operates locally | The selected harness/companion actually executes the task and reports its state |

Avoid launch copy such as **anything**, **every millisecond**, **works everywhere**, **fully understands**, **one click builds anything**, or **unlimited**. Do not print estimated time as a countdown unless it comes from a defensible estimate, and do not display invented percentages. The interface should be confident because it makes the work inspectable.

## Acceptance of the design implementation

The first design review should use one real Instagram source and one real local outcome, not a collection of marketing screenshots. A new user must be able to identify the current source, ask a question, inspect its evidence, choose the relevant action, stop it, and open the checked result without navigating through a plan dashboard. Test the same journey with an inaccessible source and an ambiguous resource; the product should remain composed and useful when it cannot complete the task.

Ship the short working journey before adding elaborate hero rendering. The premium impression should come from clear choices, reliable state, accurate evidence, fast response, and careful typography.
