# Local dev baseline snapshot

This directory holds `baseline.archive` - a gzipped `mongodump` of a full,
coherent **single-tenant (Blue Nest)** dataset used as the fixed starting point
for local **manual testing**.

`baseline.archive` is **gitignored** because it embeds real children/staff names
(the same PII policy as `famly-templates/`). It stays on your machine only.

## What's in it

Full nursery lifecycle under one org (`blue-nest`):

- 5 branches (harrow, borehamwood, pinner active; pinner-green, northwood), 10 rooms
- Real-named staff (46) and children (228) with active room assignments
- Role logins: `admin@`, `director@`, `regional@`, `harrow.manager@bluenest.uk`
  (passwords from `.env` `DEFAULT_*_PASSWORD`)
- Enquiries across **every** pipeline stage (new → registered, plus cancelled/lost/spam)
- Leave requests in every state (pending / approved / declined, four-eyes preserved)
- Rota shifts (this week), staff attendance (today), child attendance (today)
- Terms, staff PINs, kiosk devices, daily logs, taxonomy, catalogue, products

## Commands

| Command | What it does |
|---|---|
| `make baseline-reset`    | Drop the DB and restore it to this exact baseline |
| `make baseline-snapshot` | Overwrite this archive with the CURRENT DB (save new baseline) |
| `make docker-up` / `make docker-restart` | Restore the baseline automatically **if the DB is empty**, else keep your data |

On a normal restart your data persists (the Mongo volume survives), so you keep
any manual test changes. Use `make baseline-reset` when you want a pristine
baseline again.

## Rebuilding from scratch

If the archive is ever lost, rebuild it: create the `blue-nest` org, run the
structural seeds (`seed-branches`, real staff/children from the local
`famly-templates/` export, `seed-users`, `seed-taxonomy`, `seed-catalogue`,
`seed` products, `seed-daily`), stamp `org_id` on every collection, then run
`python3 scripts/seed-baseline-lifecycle.py` for the operational lifecycle and
`make baseline-snapshot`. See the "Local baseline dataset" note in `CLAUDE.md`.

Note: importing real staff/children from `famly-templates/` used the
`cmd/seedfamly` command, which has since been retired; restore it from git
history if you need to re-import from a raw Famly export.
