SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

.PHONY: test eval smoke update-installed-plugins update-installed-plugins-dry-run pi-install-local pi-uninstall-local publish-pi publish-pi-dry-run

CONSULT_PI_LOCAL_PACKAGE := $(abspath consult)

# Cheap, deterministic checks first: a failing test suite must not stop the
# validator from reporting, since prose changes are the common case and the
# validator is the check that covers them.
test:
	node scripts/validate-skill-anatomy.mjs
	node scripts/validate-skill-anatomy.mjs --self-test
	pnpm run check:links
	pnpm test
	pnpm --dir consult test

# Requires the unpublished `do-eval` sibling checked out beside this repo, so it
# is opt-in rather than part of `make test`.
eval:
	pnpm --dir eval test
	pnpm --dir eval typecheck

# Smoke-test changed skills against a real Claude Code process. Uses the existing
# Claude Code login, so it does not bill the API. `make smoke ARGS=--load-only`
# skips the one billed session and only checks that the host registers every skill,
# which `make test` cannot see. Forward other flags the same way.
smoke:
	node scripts/claude-smoke.mjs $(ARGS)

update-installed-plugins:
	scripts/update-installed-plugins.sh

update-installed-plugins-dry-run:
	scripts/update-installed-plugins.sh --dry-run

pi-install-local:
	scripts/pi-install-local.sh

pi-uninstall-local:
	pi remove "$(CONSULT_PI_LOCAL_PACKAGE)"

publish-pi:
	scripts/publish-pi-packages.sh

publish-pi-dry-run:
	scripts/publish-pi-packages.sh --dry-run
