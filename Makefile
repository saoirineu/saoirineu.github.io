PORT ?= 5174
FIREBASE_PROJECT ?= sao-irineu

serve:
	npm --prefix frontend run dev -- --host --port $(PORT)

up:
	git add -u && git commit -m "up" && git push

aup:
	git add -A && git commit -m "up" && git push

firestore-rules:
	firebase deploy --only firestore:rules --project $(FIREBASE_PROJECT)
