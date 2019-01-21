#!/bin/bash

set -e

: "${POSTGRESQL_HOST:=sigarillo-postgresql}"
: "${POSTGRESQL_PORT:=5432}"

until (echo > /dev/tcp/${POSTGRESQL_HOST}/${POSTGRESQL_PORT}) &> /dev/null; do
  echo "waiting for postgresql server to be ready..."
  sleep 5
done

cd ${SIGARILLO_DIR}
echo "initialising / updating database..."
yarn run db:migrate
echo "starting sigarillo..."
exec dumb-init node src/index.js

