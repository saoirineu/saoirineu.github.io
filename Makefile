PORT ?= 5174

serve:
	npm --prefix frontend run dev -- --host --port $(PORT)

up:
	git add -u && git commit -m "up" && git push

aup:
	git add -A && git commit -m "up" && git push
