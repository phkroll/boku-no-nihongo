# Boku no Nihongo

Personal offline web app (iPhone Home Screen) for collecting and investigating Japanese learning data. Plain HTML/CSS/ES modules, no dependencies, no build. Design: `docs/superpowers/specs/`, open points: `docs/grooming.md`, usage: `README.md`.

- `npm test`, `npm run serve`, `npm run convert-seed`
- Node 24 (`.nvmrc`); never `innerHTML`; personal data and seed files live in gitignored `out/`

## Publishing rules (the repo is public on GitHub)

Nothing gets committed or pushed that could be legally problematic. Before every commit and push, check the diff — and for a first push the whole history — against this list; if anything matches, stop and tell the user.

| Area | Never in the repo |
|---|---|
| **Personal data** | learning data, seed/import files, exports, backups (→ `out/`); test fixtures are synthetic |
| **Privacy** | names or emails other than the author's commit identity; machine paths (`/Users/…`); secrets, tokens, `.env` |
| **Employer** | references to the employer, its projects, customers or internal tools; the company Claude licence is mentioned only once the employer has agreed (pending) |
| **Third-party content** | copied code, dictionary data (e.g. KANJIDIC/JMdict: CC BY-SA, needs credit + share-alike), fonts, images, audio — unless the licence allows it and source + licence are listed under "Credits" in `README.md` |
| **Dependencies** | none today; adding one needs a licence check and a line under "Credits" |

- AI-generated code is fine; `Co-Authored-By: Claude` trailers stay
- Already committed something problematic: don't push; clean the history only with the user's yes, after a backup bundle in `out/`
- Never add a remote, push or publish without the user's explicit go
