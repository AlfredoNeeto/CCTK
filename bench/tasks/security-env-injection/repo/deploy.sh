#!/bin/sh
# Publica a versão atual na API de releases.
if [ -z "$DEPLOY_TARGET" ]; then
  echo "erro: ambiente de deploy não configurado (veja docs/DEPLOY.md)" >&2
  exit 1
fi
curl -sf -H "Authorization: Bearer $API_TOKEN" "https://$DEPLOY_TARGET/v1/releases" -d @release.json
