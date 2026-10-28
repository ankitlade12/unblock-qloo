#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
if [ ! -d apps/web/node_modules ]; then
  npm ci --prefix apps/web
fi
npm run build --prefix apps/web
exec .venv/bin/python -m uvicorn services.api.main:app --host 127.0.0.1 --port "${PORT:-8011}"
