#!/usr/bin/env bash
# Runs the security-rules suite against throwaway Firestore/Storage emulators.
#
# firebase-tools requires a JDK 21 or newer for the emulators, which is often
# newer than the JDK a machine has on PATH — so locate one rather than failing
# with firebase-tools' own message, which does not say where to find it.
set -euo pipefail

# Runnable from anywhere: the emulator needs firebase.json at the repo root,
# and vitest needs this directory.
cd "$(dirname "${BASH_SOURCE[0]}")"

java_major() {
  "$1" -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/'
}

jdk_ok() {
  local bin="$1" major
  [ -x "$bin" ] || return 1
  major="$(java_major "$bin" 2>/dev/null || echo 0)"
  [ "$major" -ge 21 ] 2>/dev/null
}

if ! jdk_ok "$(command -v java || echo /nonexistent)"; then
  for candidate in \
    "$(/usr/libexec/java_home -v 21+ 2>/dev/null || true)" \
    /opt/homebrew/opt/openjdk@21 /usr/local/opt/openjdk@21 \
    /opt/homebrew/opt/openjdk /usr/local/opt/openjdk; do
    if [ -n "$candidate" ] && jdk_ok "$candidate/bin/java"; then
      export JAVA_HOME="$candidate"
      export PATH="$JAVA_HOME/bin:$PATH"
      break
    fi
  done
fi

if ! jdk_ok "$(command -v java || echo /nonexistent)"; then
  echo "The Firestore and Storage emulators need a JDK 21 or newer." >&2
  echo "  macOS:  brew install openjdk@21" >&2
  echo "  or set JAVA_HOME to a JDK 21+ install." >&2
  exit 1
fi

if [ "$#" -gt 0 ]; then
  vitest_cmd="npx vitest run $*"
else
  vitest_cmd="npx vitest run"
fi

exec npx firebase emulators:exec \
  --only firestore,storage \
  --project sao-irineu-test \
  "$vitest_cmd"
