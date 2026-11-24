# Idea: simple multi-user distribution via Pages

Status: idea only, nothing built.

## Idea
- Several users, no password / registration
- Each user: private set + shared set; a new entry goes to private, shared or both
- Published sets (per user + shared) act as the database instead of phone-only storage

## Core constraint
- GitHub Pages serves files only; the app can read from it, never write — writes need a commit or a backend

## Options
| Option | Write path | Trade-off |
|---|---|---|
| A. Pages read-only + merge | user exports file → merged into repo (import report) | no infrastructure; manual, "suggest changes" flow |
| B. GitHub as database | app commits via GitHub API, Pages updates ~1 min later | each user needs a token; any token holder can change everything; "private" is public |
| C. Small hosted backend (Supabase, Firebase, Cloudflare — free tiers) | app writes directly, offline-first sync | real multi-user and privacy; a server again; needs a light login |

## Constraints of "no password"
- "Private" sets readable and changeable by anyone who knows the user name
- Concurrent edits need merging (contradictions, duplicates)

## Already in place
- Content / knowledge split (`data/content.json`, `data/knowledge.json`) ≈ shared / private
- Merge import with report: no duplicates, contradictions shown
- Origin + import record per entry ≈ who added what
- Offline-first app; sync fits A, B and C

## First decision if pursued
- Must private data really be private? No → B; yes → C
