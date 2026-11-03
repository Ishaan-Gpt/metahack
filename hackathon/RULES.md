# Meta Global AI Developer Hackathon: the rules (read 2026-11-03)

Status key: **CONFIRMED** = in an official page, quoted. **UNKNOWN** = not in any public official text, with who to ask.
Nothing was signed, accepted, logged into or submitted to get this. The submit form is behind a Cerebral Valley (CV) login and was not opened.

## Sources read

| # | Source | Used for |
|---|---|---|
| S1 | https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver, "Hackathon Terms & Conditions ("Official Rules") and Event Waiver" (full text read in the browser; the page is JavaScript-rendered, so a plain fetch shows "Loading...") | **The Official Rules.** Everything marked CONFIRMED below comes from here unless noted. |
| S2 | https://cerebralvalley.ai/e/meta-ai-developer-hackathon (event page) | Schedule, tracks, themes, tools, partner credits |
| S3 | https://dev.meta.ai/events/global-hackathon (Meta's own page) | Same as S2, plus links to docs |
| S4 | https://dev.meta.ai/docs/ (Meta Model API docs) | Models, base URL, endpoints |
| S5 | Third-party summaries (madrobot.blog, superpowerdaily.com, internshala): they only repeat S1/S2. Not authority. |
| S6 | https://github.com/meta-ai-hackathon/meta-hack: **a participant's own project repo, NOT the organizers.** Its "New work only / public repo / max team of 4 / 3-minute video" list is that team's own reading. **Do not treat it as a rule.** |

## The answers

### 1. May a pre-existing project be entered and improved?
**UNKNOWN as an explicit rule. Nothing in the Official Rules forbids it, and nothing allows it by name.**
- No "new work only", "built during the event", cutoff date, or "disclose prior work" sentence exists in S1, S2 or S3. (S1 was read in full.)
- What S1 does say about the Submission (quote): "By submitting a project ... the Participant represents, warrants, and agrees that their Submission: (a) is their (or their applicable team's or organization's) original work product; (b) is solely owned by the Participant, their applicable team, or organization, with no other person or entity having any right or interest in it; and (c) does not violate the intellectual property or other proprietary rights ... of any other person or entity."
- And: "Participants may also include open source software or hardware, provided applicable open source licenses are followed and the Submission enhances or builds upon the underlying open source product."
- Judging says criteria apply "only to projects submitted during the Hackathon, not to applications". That means "submitted during", not "built during". The Waiver is also dated "October 25, 2026".
- The startup track is described as "technical founders building a product" and S2/S3 say "teams and founders building a real product" judged on "technical execution and whether it holds up in production". A product that already exists is the natural entrant for that track. That reading is ours, not a quote.
- **Previous hackathon wins disqualify?** UNKNOWN: not mentioned anywhere.
- **Who to ask:** the Meta hackathon Discord (link is only given to accepted participants after login; not public) or CV support. One short question: "May an existing product be entered in the startup track if we add Meta-model features during the event? Is disclosure of prior work required?" **Ishaan must ask this (login needed).**
- **Safe handling regardless of the answer:** state plainly in the writeup and the video that Moovi existed before, and exactly which parts are new during the hackathon (the Meta models). It costs nothing and removes any "hidden prior work" disqualification risk. (Do not claim anything is new that is not.)

### 2. IP and licence terms: CONFIRMED (S1)
- "the entrant retains ownership of all intellectual and industrial property rights (including moral rights) in and to the Submission."
- But "As a condition of submission, Entrant grants the Organizers, their subsidiaries, agents and partner companies, a perpetual, irrevocable, worldwide, royalty-free, and non-exclusive license to use, reproduce, adapt, modify, publish, distribute, publicly perform, create a derivative work from, publicly display, and otherwise exploit the Submission for any purpose without restriction ..."
- "none of the Organizers can agree to obligations of confidentiality ... your Materials will not be considered confidential or proprietary" and a royalty-free, sub-licensable, perpetual licence to Materials.
- Winners' name, logo, likeness may be used in publicity "in perpetuity".
- **Implication for Ishaan:** whatever is submitted (including Moovi code shown or linked) gets a perpetual licence to Meta/CV. Do not put anything in the submission he is not willing to license that way (e.g. unreleased brand assets, reference media he does not own, anyone else's footage or voices). This is a **Ishaan decision**.
- Third-party media in the demo (stock footage, music, references' clips) must not violate others' rights (clause (c)).

### 3. Team size: CONFIRMED (S1)
- Indie track: "individual builders and students, teams of up to four (4)".
- **Startup track: no number given.** "Open to technical founders building a product. The startup Representative must be an active employee of the startup and duly authorized designated individual to receive notices and prize payment on behalf of the startup."
- Teams appoint one Representative who submits and must "identify all other team members in the project submission". Each member must have read the Rules.
- **Blocking fact for Ishaan:** the startup track needs a "startup" with a Representative who is "an active employee of the startup". **UNKNOWN whether Moovi has a legal entity.** If Ishaan (and Vignesh) are not employees of a registered company, the track may not fit and the indie track would (teams of up to 4, individual builders). Track is chosen at application time ("A participant may apply for one (1) track only, and a project submission may be entered in one (1) track only"), so a switch is probably not possible: **ask CV.** Ishaan says he applied to Startup. Also prizes are paid to the startup/Representative with W-9 or W-8BEN; non-US winners fill W-8BEN.

### 4. Required submission items and formats
- **Where:** CONFIRMED (S1): "Participants will submit their project to Cerebral Valley's portal at https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit." That URL redirects to the CV login. Needs the account used for the application.
- **Deadline:** CONFIRMED (S2, S3): "Nov 4, 9:00 PM: Project submissions due", all times ET. (Equivalent: 5 Nov 06:30 IST, per Internshala; Nov 5 01:00 UTC.) Dates "may change at Meta's sole discretion".
- **Representative must identify all team members in the submission:** CONFIRMED (S1).
- **Everything else (video length, repo public/private, demo link, writeup fields, file types): UNKNOWN.** The public pages say only "Develop and showcase a working AI project" and the Judging text mentions "a working, impressive demo", "whether the product holds up live" and "the quality of the demo video". So **a demo video and a working demo are scored (25%)**; no length or format is stated.
  - Participant repo S6 claims "3-minute demo video", "public repo": unverified, but a 3-minute max video and a public repo are the safe plan (works if the rule is looser; costs nothing).
  - **Who to ask / where to see it:** the form fields appear only after login at the submit URL (Ishaan: log in, open the form, copy the field list and any length limits into `docs/agents/meta-hack/FORM-FIELDS.md`; do not submit). Discord pinned messages usually hold the guide.
- **Credits:** S1: "$150 in Meta Model API credits, valid for a 10-day development window" for selected participants. "Before claiming your credits, carefully review the Credit Terms" (separate page, login-gated: UNKNOWN). S6 claims "last day to claim API credits" is Nov 4 9 PM ET: unverified. Partner credits (S2): Baseten $100 + 2M TPM, Modal $100, Fireworks $100 (select participants).

### 5. Which Meta models MUST be used; may others be used alongside?
- **CONFIRMED text (S1):** "Participants build with Meta AI products, including Muse Spark, Glimmer, SAM 3, and any other Meta AI products identified on the Event page." Judging: "Use of Meta AI Tooling (25%) ... how creatively the team used Meta's AI tooling, whether they went beyond a basic integration, and whether they surfaced unexpected capabilities". Also "whether it fits one of the problem statements" (the two themes: Build for Your World, Push the Frontier).
- **No minimum list, no "must use X", no statement that other models are banned.** S1 does not say "only Meta". S2/S3 call the tools Muse Spark series, Muse Wonder, Muse Image, SAM 3.1 via the Meta Model API, Meta open-weights models, Muse Code.
- **UNKNOWN:** whether non-Meta models may be used alongside. Safe plan: **Meta models do all the model work that is shown in the demo; no other model's output appears in the demo path.** Moovi's other providers stay as optional bring-your-own-key, off in the demo.
- Participant repo S6 claims a "pass/fail gate: genuinely use Meta Model API / open-weight models"; unverified, but consistent with the 25% scoring.
- Note on names: S1 says "Glimmer" and "SAM 3"; S2/S3 say "Muse Wonder", "SAM 3.1". Meta API docs (S4): ids `muse-spark-1.3` (also 1.2, 1.1), `muse-wonder-1.0` (preview), `muse-image-1.0`, `muse-voice-transcribe-1.0`, `sam-3.1`. Muse Spark Open and Muse Glimmer are open-weight, self-hosted (not through the API).

### 6. Judging criteria and weights: CONFIRMED (S1)
Same four criteria for both tracks:
| Criterion | Weight | Definition (S1) |
|---|---|---|
| Impact | 30% | "the real-world potential of the Project, who benefits, how much it matters, whether it could become something people use, and whether it fits one of the problem statements" |
| Use of Meta AI Tooling | 25% | "how creatively the team used Meta's AI tooling, whether they went beyond a basic integration, and whether they surfaced unexpected capabilities" |
| Demo | 25% | "whether the Project has a working, impressive demo, whether the product holds up live, and the quality of the demo video" |
| Technical Depth & Execution | 20% | "whether the engineering is sound and thoughtfully refined and the Project demonstrates real craft" |
Track blurbs (S2/S3): startup "judged on technical execution and whether it holds up in production"; indie "creativity, technical ambition, and whether it works". Finalists are chosen by a panel of judges; "The judges' selections are final and binding." Finals: closing ceremony Nov 9 (S2).

### 7. Prizes: CONFIRMED (S1)
Startup track, total $550,000: 1st **$250,000**, 2nd $150,000, 3rd $75,000, 4th $50,000, 5th $25,000.
Indie track, total $400,000: 1st $150,000, 2nd $100,000, 3rd $75,000, 4th $50,000, 5th $25,000.
**Bonus prizes:** "up to $50,000 in the aggregate ... recognizing standout projects or community achievements. Those categories may include, without limitation, a community vote award, most viral project award, or other unique or notable project categories designated by the Organizers. The number, categories, allocation, and value ... may be determined by the Organizers before or during the judging process. Any additional prize, including a public-vote prize, will be announced on or about November 10, 2026. Additional prizes do not reduce the track prizes above." Total pool "$1,000,000". Payment within 30 days of verification, via Tremendous, USD; W-9 / W-8BEN; winners pay own taxes and fees.
- **Sponsor prizes (Baseten, Modal, Fireworks):** none listed. Only credits. UNKNOWN whether any exist.
- Side prizes therefore: **community vote** and **most viral project** are named as possible; the rest are undisclosed. Ask in Discord what the bonus categories are and how a public vote would work (if a public vote exists, it opens after the deadline, so prepare a shareable page and a 30-60 s clip).

### 8. Submission platform and exact steps
- Platform: CV portal (S1). Steps we can confirm: (1) be an accepted participant who accepted the Official Rules and waiver (S1: "has signed the event waiver and Official Rules" before payment; S3: rules "must be accepted by the selected participants"); (2) the **Representative** logs in at the CV submit URL and enters the project; (3) names all team members; (4) one track only. The field list is login-gated (UNKNOWN).
- **UNKNOWN: has Ishaan been accepted?** Applications closed 25 Oct 11:59 PM ET; acceptance email was due 26 Oct 9 AM ET. Everything below depends on it. **Ishaan: check the email for the acceptance/rules link and that the account on the submit page shows the project form.**

## Other conditions that can disqualify (S1)
- Age 18+. Not in Belarus, China, Russia, Ukraine, Syria, Crimea/Donetsk/Luhansk, Cuba, North Korea, Iran, nor sanctioned. Meta/CV staff and families excluded. (Ishaan is in India per the project's own docs; eligible by text, but he should confirm.)
- "All fields in the event application form must be completed accurately and truthfully. Incomplete or false information may result in disqualification."
- Winners are verified before payment; "The Organizers reserve the right to change or cancel the Hackathon at any time."
- Code of conduct applies to all spaces including shared repositories.

## What this means (short)
- **Can we use Moovi and an existing project? The text does not forbid it, but it also does not say yes. UNKNOWN, ask once in Discord today.** Entering it with open disclosure of what is new is the safe path, and the startup track blurb ("a real product ... holds up in production") points at existing products.
- **Biggest real risks:** (a) is Ishaan accepted; (b) startup track needs a startup and an employee Representative; (c) submit form fields and video limits are login-gated.
