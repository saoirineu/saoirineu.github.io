#!/usr/bin/env bash
# Runs a command with a JDK 21 or newer on PATH:  tests/with-jdk21.sh <command> [args...]
#
# firebase-tools requires a JDK 21 or newer for the emulators, which is often
# newer than the JDK a machine has on PATH — so locate one rather than failing
# with firebase-tools' own message, which does not say where to find it.
# Used by tests/rules/run.sh and `make test-mail-queue`.
set -euo pipefail

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

exec "$@"
