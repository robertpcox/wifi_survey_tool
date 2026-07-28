# Code navigation — find ownership without loading the project

## Start every context

Start from the current step named by `Scope/handover.md`.
Use relevant rows in `docs/module-map.md` before opening implementation files.

Open `Scope/v3_contracts.md` only when the task touches exchanged data.
Open `Scope/coding_pattern.md` when creating, splitting, or reviewing files.
Open `Scope/glossary.md` when a term is ambiguous; do not invent a synonym.

## Module map

The build generates `docs/module-map.md` from paths, exports, imports, and file metrics.

Each row contains:

- path
- public surface
- direct dependencies
- line count
- byte count
- longest-line bytes
- covering test file, or a marker when none exists

Search the map before searching source:

```sh
rg -n "Runner|poll|heatmap|comparison" docs/module-map.md
```

## Targeted source search

Find exported names:

```sh
rg -n "export (async )?(function|class|const)" src
```

Find direct imports of a module:

```sh
rg -n "from .*target-module" src
```

List files without reading them:

```sh
rg --files src | sort
```

Check context size before opening candidates:

```sh
node tools/check_file_sizes.mjs src --allow-review
```

## Data inspection

Do not open full captures or result files to discover shape.

Use summaries:

```sh
jq 'keys' results/example.json
jq '{meta:.meta, counts:{samples:(.samples|length), events:(.events|length)}}' results/example.json
```

Every data family README lists schema, provenance, representative file, and safe inspection commands.

## Ownership rules

- Page boot lives under `src/apps/<app>/`.
- User-visible capabilities live under `src/features/<feature>/`.
- Pure contracts and calculations live under `src/domain/`.
- External or browser APIs live under `src/adapters/`.
- Small cross-cutting utilities live under `src/shared/`.
- Report sections are independent feature directories.
- Position providers are independent adapter directories.

If ownership is unclear, fix the directory boundary or module map before changing code.

## Fan-out handoff

Follow `Scope/step_standard.md`.

Each parallel task adds only its unique:

- owned directory
- allowed shared interfaces
- forbidden files owned by another task
- fixtures and commands that prove completion
- validation fixtures and commands
- downstream outputs

No two agents edit the same shell, registry, contract, or shared module concurrently.
