#!/bin/sh
set -eu
# Free Render does not provide the paid pre-deploy command feature.
# Applying Django migrations at each start is fine for this small demo.
python manage.py migrate --noinput
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120 --access-logfile - --error-logfile -
