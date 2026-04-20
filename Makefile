PORT ?= 5174
FIREBASE_PROJECT ?= sao-irineu
FIREBASE ?= $(shell which firebase 2>/dev/null || echo npx firebase)

.PHONY: serve up aup firestore-rules storage-rules backup migrate-dry migrate migrate-and-clean smtp-secrets deploy-functions

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