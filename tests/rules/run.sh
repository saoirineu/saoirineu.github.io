#!/usr/bin/env bash
# Runs the security-rules suite against throwaway Firestore/Storage emulators.
#
# The emulators need a JDK 21 or newer; ../with-jdk21.sh finds one when the JDK
# on PATH is older.
set -euo pipefail

# Runnable from anywhere: the emulator needs firebase.json at the repo root,
# and vitest needs this directory.
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ "$#" -gt 0 ]; then
  vitest_cmd="npx vitest run $*"
else
  vitest_cmd="npx vitest run"
fi

exec ../with-jdk21.sh npx firebase emulators:exec \
  --only firestore,storage \
  --project sao-irineu-test \
  "$vitest_cmd"
