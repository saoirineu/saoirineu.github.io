PORT ?= 5174
FIREBASE_PROJECT ?= sao-irineu
FIREBASE ?= $(shell which firebase 2>/dev/null || echo npx firebase)

.PHONY: serve up aup firestore-rules storage-rules backup migrate-dry migrate migrate-and-clean smtp-secrets leader-token-secret regenerate-leader-token leader-link seed-leader-demo unseed-leader-demo deploy-functions

serve:
	npm --prefix frontend run dev -- --host --port $(PORT)

up:
	git add -u && git commit -m "up" && git push

aup:
	git add -A && git commit -m "up" && git push

firestore-rules:
	$(FIREBASE) deploy --only firestore:rules --project $(FIREBASE_PROJECT)

storage-rules:
	$(FIREBASE) deploy --only storage --project $(FIREBASE_PROJECT)

# Installs npm dependencies for the scripts directory
# This target runs 'npm install' in the scripts folder, creating/updating node_modules
# Useful for setting up project dependencies before running scripts
scripts/node_modules:
	npm --prefix scripts install

backup: scripts/node_modules
	node scripts/backup.js

smtp-secrets:
	@set -a && . functions/smtp.env && set +a && \
	printf '%s' "$$SMTP_HOST" | $(FIREBASE) functions:secrets:set SMTP_HOST --project $(FIREBASE_PROJECT) && \
	printf '%s' "$$SMTP_PORT" | $(FIREBASE) functions:secrets:set SMTP_PORT --project $(FIREBASE_PROJECT) && \
	printf '%s' "$$SMTP_USER" | $(FIREBASE) functions:secrets:set SMTP_USER --project $(FIREBASE_PROJECT) && \
	printf '%s' "$$SMTP_PASS" | $(FIREBASE) functions:secrets:set SMTP_PASS --project $(FIREBASE_PROJECT)

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

# Generates a leader-review URL for an existing registration.
# Usage: make leader-link ID=<registrationId> EMAIL=<leaderEmail> [BASE=<baseUrl>]
# BASE defaults to http://localhost:5174 (dev). For production, pass BASE=https://saoirineu.github.io
leader-link:
	@node scripts/leader-link.js --id "$(ID)" --email "$(EMAIL)" $(if $(BASE),--base "$(BASE)",)

# Seeds a demo registration in Firestore so the example leader-review URL works locally.
# Prints the URL after seeding. Run unseed-leader-demo to remove it afterwards.
seed-leader-demo: scripts/node_modules
	@node scripts/leader-demo.js --seed

unseed-leader-demo: scripts/node_modules
	@node scripts/leader-demo.js --unseed

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