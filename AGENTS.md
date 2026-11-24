# Boku no Nihongo

Personal offline web app (iPhone Home Screen) for collecting and investigating Japanese learning data. Plain HTML/CSS/ES modules, no dependencies, no build. Design: `docs/superpowers/specs/`, open points: `docs/grooming.md`, usage: `README.md`.

## Development principle: discovery through usage (decision by user)

**The app is a tool for discovering what to build, not an understood product.** Build → Use → Discover → Refine → Repeat.
Active across sessions until the user explicitly moves to product development. Only this project; nothing global changes.

- Usable functionality and fast feedback over upfront specification
- Designs, specs, data model = working hypotheses; new requirements are expected, not a reason to restart planning
- Simple, reversible, low-risk changes: decide and implement directly, mention decisions briefly afterwards
- Planning proportional to complexity and risk; no separate design → spec → plan → approval stages per change
- Implementation plans welcome as rough history (`docs/superpowers/plans/`): write, then build without waiting for approval
- Non-blocking uncertainties and ideas → `docs/grooming.md`
- Collected data survives model and code changes (migration, never drop)
- Keep code quality, simplicity, tests, maintainability
- **Stop and ask only when:** it materially affects intended usage and can't be inferred · risk of data loss · expensive or hard to reverse · substantial complexity or architectural consequences
- **Workflows (Superpowers etc.):** adapt to this phase; skip full brainstorming / spec / plan / approval for reversible low-risk changes; this principle wins over their defaults
- Success = what the user can use, explore and discover, not how thoroughly it's specified

## Working here
- Work happens in a local sandbox: `sandbox/start.sh` (gitignored, never committed; see `sandbox/README.md`). Push from the host
- Cross-project lessons (`~/.claude/lessons/`) don't apply here and aren't available in the sandbox; lessons and findings from this project go into `docs/grooming.md`
- `npm test`, `npm run serve`, `npm run convert-seed`
- After changing app files: `npm run stamp` (build stamp + offline file list in `sw.js`; without it phones keep the old version — tests and the pre-push check fail)
- Node 24 (`.nvmrc`); never `innerHTML`; personal data and seed files live in gitignored `out/`

## Publishing rules (the repo is public on GitHub)

Nothing gets committed or pushed that could be legally problematic. Before every commit and push, check the diff — and for a first push the whole history — against this list; if anything matches, stop and tell the user.

| Area | Never in the repo |
|---|---|
| **Personal data** | raw seed files, exports, backups (→ `out/`); test fixtures are synthetic. Published learning data lives only in `data/` (below) |
| **Privacy** | names or emails other than the author's commit identity; machine paths (`/Users/…`); secrets, tokens, `.env` |
| **Employer** | references to the employer, its projects, customers or internal tools; the company Claude licence is mentioned only once the employer has agreed (pending) |
| **Third-party content** | copied code, dictionary data (e.g. KANJIDIC/JMdict: CC BY-SA, needs credit + share-alike), fonts, images, audio — unless the licence allows it and source + licence are listed under "Credits" in `README.md` |
| **Dependencies** | none today; adding one needs a licence check and a line under "Credits" |

- **Enforced on push:** `.githooks/pre-push` blocks pushes with files from `out/`, backups, env/key files, machine paths, foreign email addresses and the words in `.git/info/publish-blocklist` (local, never pushed). Per clone, once: `git config core.hooksPath .githooks` and create the blocklist
- The hook can't judge licences or copied content: before pushing new content or a dependency, check it against the table above
- **Published learning data** (decision by user): `data/content.json` (kanji, words, grammar, sentences, relations, tags) and `data/knowledge.json` (ratings, mix-ups, notes) — both public for now; later only content: then delete `data/knowledge.json`, nothing else changes. Write both with `npm run publish-data -- <app json>`
- AI-generated code is fine; `Co-Authored-By: Claude` trailers stay
- Already committed something problematic: don't push; clean the history only with the user's yes, after a backup bundle in `out/`
- Never add a remote, push or publish without the user's explicit go
