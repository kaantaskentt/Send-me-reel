# What public users actually need: second demand pass

Researched 2026-09-12. This is a purposive qualitative sample, not a representative survey. The [machine-readable ledger](./demand-ledger.json) contains **22 first-person reports across 21 discussion clusters**, including **6 reports directly from AI/automation/coding-agent builders**. Other segments are deliberately separate. Seven promotional, weak, or ambiguous leads are recorded outside the count. No interviews, purchases, retention measurements, or outreach were performed.

## The recommendation changes in emphasis

The better starting proposition is **“Make the useful part of this AI demo work for my project.”** It is not “process my entire backlog,” and it is not automatically “copy the creator exactly.”

There is relatively concrete evidence for the gap between an attractive demonstration and a usable environment. A business-background CrewAI learner describes dependency and integration errors when reproducing videos ([D09](https://community.crewai.com/t/where-to-start-in-this-ai-automation-journey/3387)). An n8n user can reproduce tutorial workflows but cannot translate a real customer's need into an implementation ([D10](https://www.reddit.com/r/AiAutomations/comments/1tzg5cj/im_confused_and_i_dont_know_how_to_help_people/)). These are different failures: the first needs technical adaptation; the second needs problem definition. More accurate transcription alone fixes neither.

An experienced automation builder explicitly wants robust end-to-end examples and is open to paying for high-quality material, while criticizing basic demos ([D21](https://www.reddit.com/r/n8n/comments/1m4t3d3/seeking_advanced_automation_content_moving_beyond/)). That is stated willingness, not a transaction. It points toward context, suitability and practical completion as the premium value.

**Inferred first customer:** someone already attempting a real AI-assisted project, who has an immediate saved reference and a result they want today. Mac is a practical engineering boundary, not a market preference established by these reports. “Everyone who saves posts” is too broad.

## Four jobs, and what the evidence does not establish

| Job | Evidence | Product implication |
| --- | --- | --- |
| Recover a useful resource | An AI creator asks for original prompt sources behind repeated comment-gated Instagram posts ([D05](https://www.reddit.com/r/generativeAI/comments/1si59mm/where_are_people_on_instagram_getting_their/)). | Show the actual visible source and distinguish a recovered prompt from an inferred replacement. |
| Find something already saved | Users describe large archives, slow retrieval and collection friction ([D01](https://www.reddit.com/r/Instagram/comments/1u65c6z/how_to_find_saved_posts/), [D02](https://www.reddit.com/r/Instagram/comments/1s8stxf/am_i_the_only_one_annoyed_theres_no_search_for/), [D03](https://www.reddit.com/r/Instagram/comments/1qa03go/saved_posts_on_instagram_are_great_until_you/)). | Make capture/search effortless. These reports do not establish demand for coding agents or a premium subscription. |
| Make a demonstrated workflow run here | Three ComfyUI users describe missing nodes, obsolete instructions or broken installations ([D06](https://www.reddit.com/r/comfyui/comments/1tb4rrq/how_can_you_learn_comfyui_if_all_workflows_are/), [D07](https://www.reddit.com/r/comfyui/comments/1s8tu7r/how_to_learn_comfyui_in_2026_all_tutorials_seem/), [D08](https://www.reddit.com/r/comfyui/comments/1nw7bji/feels_like_i_am_downloading_models_and_installing/)). | Inspect the actual environment and choose compatible steps. This adjacent segment often has GPU requirements beyond a Mac-only promise. |
| Understand and adapt, rather than copy | A course user says copying code stopped producing understanding ([D14](https://www.reddit.com/r/learnprogramming/comments/136w6pg/i_feel_like_im_just_copying_what_this_udemy/)). | Ask whether the immediate purpose is learning, evaluating or producing; explanations and user participation can be the outcome. |

The “fleeting GitHub name” case is a credible product demonstration, but this sample did **not** establish how frequently people lose one-frame details, how often the correct detail is legible in the original, or whether this alone supports recurring payment. Treat frame recovery as a measured quality requirement, not a proven mass-market purchasing motive.

## The strongest counterarguments

**A more capable agent may already solve the valuable part.** A backend developer reports losing 3–4 hours on MCP setup, then asking Claude to fix the environment successfully. They also report upgrading from Pro to Max to finish a game within limited free time ([D11](https://www.reddit.com/r/ClaudeAI/comments/1s7mfil/i_built_a_steam_game_in_10_days_with_claude_code/)). This is the clearest direct spending behavior in our target-adjacent evidence, but the beneficiary was their existing coding agent. ContextDrop must beat “paste the URL/error into Claude or Codex” in total effort and outcome quality. A handoff alone is not enough.

**Some people want fewer tools, and some saves should remain unused.** The HN discussion includes a long-time bookmark collector who rarely returned, alongside users who routinely find value in their archive ([D22](https://news.ycombinator.com/item?id=45047572)). Search-index comments were readable; live retrieval returned 429. We cannot infer that an ever-growing queue is necessarily a defect. “You should execute every save” would amplify overconsumption.

**Subscription resistance is explicit.** A paid Reader user considers leaving after a year because basic reading does not justify the cost to them ([D17](https://www.reddit.com/r/readwise/comments/1oblyn1/convince_me_to_stay_with_paid_readwise_reader/)). Another user says reliable parsing and opening content quickly justify their subscription ([D18](https://www.reddit.com/r/readwise/comments/1oblyn1/comment/nkh906b/)). These are two people in one discussion, not two independent market samples.

**Failure at import destroys the whole proposition.** One annual subscriber reports largely abandoning Reader because content extraction kept failing ([D15](https://www.reddit.com/r/readwise/comments/1gywsbj/never_use_the_app_after_buying_a_year/)). Instagram users also describe broken save-management behavior ([D04](https://www.reddit.com/r/Instagram/comments/1uilu61/instagram_saved_posts_keep_jumping_back_to_the_top/)). Beautiful downstream features do not compensate for an unreliable first step.

## How I would market and validate it

Lead with one concrete result: **“Saw an AI demo? Try it in your own project.”** Supporting copy: **“Drop the link. Find what was shown. Let your agent do the setup.”** These are proposed messages; publish a capability only once demonstrated.

The initial three actions should be “Find the tool,” “Is this useful for my project?” and “Get a working example.” Show a real source moment, the identified resource, the compatibility decision and the resulting preview. Keep the proof visible. A brain animation can illustrate the process, but cannot substitute for a working case.

Test two acquisition channels before expensive broad ads:

1. **Helpful, reproducible demonstration content:** a public AI post becomes a correctly identified repo and a working local example, with setup time, costs and failures included. Direct people to try their own link.
2. **Creator partnerships:** a legitimate “Try this example” link attached to a tutorial, preserving attribution and sending the creator fewer repetitive setup questions. This is a hypothesis, not outreach performed or proven channel demand.

Avoid a hostile “steal creators' secret prompts” position. Many prompts are not actually shown. Helpful recovery of public details and an original adaptation are valuable without claiming access to an unrevealed download.

Run an observed pilot with three cohorts: existing coding-agent users with active projects; automation practitioners; AI-media creators. Do not pool their results. Ask for the last reference they actually tried, watch their current workaround, then compare ContextDrop against their existing agent. Measure source correctness, user interventions, time to first useful answer, time to checked result, repeated use and actual payment—not agreement with a concept or clicks on a waitlist.

A proposed decision gate: after 10–15 observed users and two weeks, continue the specific workflow only if people return with their own second task and some pay after seeing the result. Set the exact thresholds before the pilot. If users only ask to retrieve posts and resist paying, test a lightweight capture tool or integration. If direct Codex/Claude performs just as well, distribute the evidence reader as a skill/MCP instead of maintaining another agent interface.

## Research-quality corrections

Search results around saved social content are unusually polluted with builders promoting tools. Examples include [Instavault placement](https://www.reddit.com/r/Instagram/comments/1srzwum/anyone_else_have_800_saved_posts_on_instagram/), [Hold That](https://www.reddit.com/r/Instagram/comments/1veu934/anyone_else_dm_reels_to_themselves_and_never_find/) and [Hako's beta pitch](https://www.reddit.com/r/PhStartups/comments/1rxaasw/tired_of_saving_reels_and_never_finding_them/). They establish competing supply, not independent customers.

A seemingly persuasive response about how an Instagram AI image was made was **explicitly an automated bot comment** ([excluded example](https://www.reddit.com/r/generativeAI/comments/1w8vr9a/how_in_the_world_can_you_generate_this_with_ai/)). A career-saves post closely mirrors our desired story, but its [author's public activity](https://www.reddit.com/user/alkr-builds/) repeatedly asks product-discovery-style questions. No proof of promotion or AI authorship was established; it is conservatively excluded from independent counts.

All reports are self-selected, largely anonymous, English-language and unverified. Repeated complaint themes can justify a small test; they cannot establish market size, an average willingness to pay, or a promise of universal video understanding. No additional paid data service is needed to resolve the next uncertainty: observation of real people attempting real tasks is now more valuable than another batch of similarly biased search results.
