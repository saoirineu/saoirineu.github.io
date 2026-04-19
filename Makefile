PORT ?= 5174
FIREBASE_PROJECT ?= sao-irineu

.PHONY: serve up aup firestore-rules storage-rules backup migrate-dry migrate migrate-and-clean

serve:
	npm --prefix frontend run dev -- --host --port $(PORT)

up:
	git add -u && git commit -m "up" && git push

aup:
	git add -A && git commit -m "up" && git push

firestore-rules:
	firebase deploy --only firestore:rules --project $(FIREBASE_PROJECT)

storage-rules:
	firebase deploy --only storage --project $(FIREBASE_PROJECT)

scripts/node_modules:
	npm --prefix scripts install

backup: scripts/node_modules
	node scripts/backup.js

migrate-dry: scripts/node_modules
	node scripts/migrate.js --dry-run

migrate: scripts/node_modules
	node scripts/migrate.js --live

migrate-and-clean: scripts/node_modules
	node scripts/migrate.js --live --delete-old
