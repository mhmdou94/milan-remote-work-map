#!/bin/sh
set -e

MODE="${APP_MODE:-server}"

case "$MODE" in
  server)
    exec gosu node node backend/dist/server.js
    ;;
  worker)
    # Cron runs with a stripped environment; capture the relevant Docker runtime
    # env vars into a sourced file so the job picks them up.
    cat > /etc/cron-env.sh <<EOF
export NODE_ENV="${NODE_ENV:-production}"
export DB_PATH="${DB_PATH:-/opt/app/data/places.sqlite}"
export TZ="${TZ:-UTC}"
export PBF_REGIONS="${PBF_REGIONS:-}"
EOF

    cat > /etc/cron.d/worker-sync <<'CRONTAB'
MAILTO=""
SHELL=/bin/sh
0 8 * * * node /bin/sh -c '. /etc/cron-env.sh && /usr/local/bin/node /opt/app/backend/dist/worker.js >> /proc/1/fd/1 2>&1'
CRONTAB
    chmod 0644 /etc/cron.d/worker-sync

    exec cron -f
    ;;
  *)
    echo "Unknown APP_MODE='$MODE' (must be 'server' or 'worker')" >&2
    exit 1
    ;;
esac
