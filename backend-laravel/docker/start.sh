#!/usr/bin/env bash
set -e

export PORT="${PORT:-10000}"

sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf

php artisan config:clear
php artisan route:clear
php artisan view:clear

php artisan migrate --force

if [ "${RUN_SEEDERS:-false}" = "true" ]; then
    php artisan db:seed --force
fi

exec apache2-foreground
