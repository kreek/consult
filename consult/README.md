# Consult

Consult for [Pi](https://pi.dev), in one package.

The Pi runtime surface is intentionally small:

- **Proof** — proof-first mode with `/proof`, `proof_start`, and `proof_done`.
- **Independent review** — after production changes settle, a fresh read-only
  Pi subprocess reviews the diff with the `code-review` skill and reports back;
  `/consult:self-review` runs it on demand. The implementing session never
  reviews its own work.

Consult skills are bundled in this package under `skills/`. There are no separate Pi packages for proof, contract-first, specify, or skills in this package layout.

## Install

```sh
pi install git:github.com/kreek/consult
```

`github:` is not a Pi package source prefix; use `git:` for GitHub shorthand.

Then in Pi:

```text
/reload
```

## Migration notes

- The old Pi `Final Value Guard` is now **Self-review**.
- `/consult:final-value` is removed; use `/consult:self-review`.
- Pi runtime extensions for pre-work, scaffold, specify, contract-first, branch isolation, and code-review runtime are no longer installed by this package. Their skills remain available when present in the bundled skills directory.

## License

MIT — see `LICENSE`. Third-party/adapted extension notices are listed in
`THIRD_PARTY_NOTICES.md`.
