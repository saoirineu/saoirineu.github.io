PORT ?= 5174
FIREBASE_PROJECT ?= sao-irineu
FIREBASE ?= $(shell which firebase 2>/dev/null || echo npx firebase)

.PHONY: serve up aup firestore-rules storage-rules firebase-rules deploy-functions deploy-backend backup migrate-dry migrate migrate-and-clean leader-token-secret regenerate-leader-token leader-link test-rules test

serve:
	npm --prefix frontend run dev -- --host --port $(PORT)

up:
	git add -u && git commit -m "up" && git push

aup:
	git add -A && git commit -m "up" && git push

# Security-rules regression suite (tests/rules). Runs against throwaway
# emulators, never the live project. Rules changes should go through this
# before `make firebase-rules`.
tests/rules/node_modules:
	npm --prefix tests/rules install

test-rules: tests/rules/node_modules
	./tests/rules/run.sh

# Everything that can run without credentials.
test: test-rules
	npm --prefix frontend test
	npm --prefix functions test

firestore-rules:
	$(FIREBASE) deploy --only firestore:rules --project $(FIREBASE_PROJECT)

storage-rules:
	$(FIREBASE) deploy --only storage --project $(FIREBASE_PROJECT)

firebase-rules: firestore-rules storage-rules

deploy-backend: firestore-rules storage-rules deploy-functions

# Installs npm dependencies for the scripts directory
# This target runs 'npm install' in the scripts folder, creating/updating node_modules
# Useful for setting up project dependencies before running scripts
scripts/node_modules:
	npm --prefix scripts install

backup: scripts/node_modules
	node scripts/backup.js

# Pushes the mail-relay shared secret. The same value must sit in
# scripts/portal-mail/relay-config.php on the santodaime.it hosting account.
mail-relay-secret:
	@set -a && . docs/credentials/mail-relay.env && set +a && \
	printf '%s' "$$MAIL_RELAY_TOKEN" | $(FIREBASE) functions:secrets:set MAIL_RELAY_TOKEN --project $(FIREBASE_PROJECT)

leader-token-secret:
	@set -a && . docs/credentials/leader-token.env && set +a && \
	printf '%s' "$$LEADER_TOKEN_SECRET" | $(FIREBASE) functions:secrets:set LEADER_TOKEN_SECRET --project $(FIREBASE_PROJECT)

# Regenerates docs/credentials/leader-token.env with a fresh random secret.
# WARNING: after running this and pushing with `make leader-token-secret` +
# `make deploy-functions`, every previously-emailed leader review link becomes invalid.
regenerate-leader-token:
	@printf 'LEADER_TOKEN_SECRET=%s\n' "$$(openssl rand -base64 48)" > docs/credentials/leader-token.env
	@echo "Wrote new secret to docs/credentials/leader-token.env"
	@echo "Next: make leader-token-secret && make deploy-functions"
	@echo "Note: this invalidates all previously-emailed leader review links."

# Generates a leader-review URL for an existing event registration.
# Usage: make leader-link ID=<registrationId> EMAIL=<leaderEmail> EVENT=<eventId> [BASE=<baseUrl>]
# BASE defaults to http://localhost:5174 (dev). For production, pass BASE=https://saoirineu.github.io
leader-link:
	@node scripts/leader-link.js --id "$(ID)" --email "$(EMAIL)" --event "$(EVENT)" $(if $(BASE),--base "$(BASE)",)

deploy-functions:
	npm --prefix functions run build
	$(FIREBASE) deploy --only functions --project $(FIREBASE_PROJECT)

### Legacy

migrate-dry: scripts/node_modules
	node scripts/migrate.js --dry-run

migrate: scripts/node_modules
	node scripts/migrate.js --live

migrate-and-clean: scripts/node_modules
	node scripts/migrate.js --live --delete-old
