# CLAUDE.md

This file provides Claude-specific guidance for working on Consult. The main
portable maintainer instructions live in `AGENTS.md`; follow that file for repo
layout, validation, skill anatomy, versioning, and release rules.

## Pi self-improvement source access

Pi can inspect its own installed package when runtime behavior, extension APIs,
or self-improvement work depends on Pi internals. Treat that package as a
read-only upstream source: read it to confirm current APIs and behavior, but
make Consult changes in this repository unless the user explicitly asks to work
on Pi itself.

For most npm-style installs, find Pi's package with:

```sh
npm root -g
```

Then look under `@earendil-works/pi-coding-agent` in that global
`node_modules` directory. Package-manager installs usually place the same global
`node_modules` tree under the manager prefix, for example
`<prefix>/lib/node_modules/@earendil-works/pi-coding-agent`. Do not hard-code a
machine-specific absolute path in repo docs or committed code. Resolve it at
runtime with `npm root -g`, `which pi`, or the package manager's prefix command.

Useful read-only entry points are the package `README.md`, `docs/`, `examples/`,
`package.json`, and exported type declarations. Follow linked docs before
changing Consult extensions that depend on Pi APIs.
