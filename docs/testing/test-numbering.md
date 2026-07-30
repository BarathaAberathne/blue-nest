# Test numbering and IDs

## IDs

Every script has a globally unique `id` in its front matter, prefixed by
domain and script type:

```text
COL-FUNC-001       Test collection
SUI-AUTH-001      Test suite
AUTH-TC-001       Test case
AUTH-UTIL-001     Test utility
DATA-AUTH-001     Test data
```

Pick the domain prefix from the closest existing one (`AUTH`, `BRANCH`,
`ROOM`, `STAFF`, `ROLE`, `ENQUIRY`, `VISIT`, `REG`, `CHILDROOM`,
`ROOMSTAFF`, `CHILDATT`, `STAFFATT`, `LOG`, `SCHEDULE`, `CONCURRENCY` — see
`test-migration-map.md` for the full list and which planned suite each
belongs to) rather than inventing a new one, unless the test genuinely
covers a new domain.

`test-validate` rejects duplicate IDs across the whole `test-platform/tests`
tree, not just within one folder.

## File naming (important — this is how `Call`/`Include` targets resolve)

Name every file so it **starts with its own id**, e.g.
`AUTH-TC-001-login.bnrest.md`, `AUTH-UTIL-001-login.bnrest.md`. The
dependency graph's Call-target resolution matches a `Call ../path/to/FILE`
target against script IDs by filename prefix — if the filename doesn't
start with the id, the graph can't map it to the right node for hierarchy
validation (the *executor*, which resolves Calls by actual file path, still
works either way — but keep the convention for the graph/visual mapper to
work correctly).

## Numbers

The human-readable `number` field shows hierarchy:

```text
1                     Harrow lifecycle collection
1.1                   Authentication suite
1.1.1                 Successful login
1.1.2                 Invalid password
1.2                   Branch setup suite
1.2.1                 Create Harrow branch
```

Utilities use a separate `U.<n>` numbering (`U.1`, `U.2`, …) since they
don't sit inside the collection's own hierarchy — they're referenced by
many places. Data files use `D.<n>` by the same logic if you introduce one
outside a specific case's own folder.

`test-validate` rejects duplicate `number`s the same way it rejects
duplicate `id`s — pick the next free slot under the right parent, don't
reuse one because a case was renumbered.

## Real example

From the migrated Authentication slice:

| id | number | type |
|---|---|---|
| `COL-FUNC-001` | `1` | Test Collection |
| `SUI-AUTH-001` | `1.1` | Test Suite |
| `AUTH-TC-001` | `1.1.1` | Test Case |
| `AUTH-TC-002` | `1.1.2` | Test Case |
| `AUTH-TC-002b` | `1.1.3` | Test Case |
| `AUTH-TC-004` | `1.1.4` | Test Case |
| `AUTH-UTIL-001` | `U.1` | Test Util |
