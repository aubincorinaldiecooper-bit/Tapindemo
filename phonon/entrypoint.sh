#!/bin/sh
set -eu
: "${PHONON_API_KEY:?PHONON_API_KEY must be set}"
exec /usr/local/bin/phonon-entrypoint serve phonon-2 --host 0.0.0.0 --port "${PORT:-8000}" --api-key "$PHONON_API_KEY" ${PHONON_THREADS:+--threads "$PHONON_THREADS"}
