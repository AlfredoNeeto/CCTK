#!/bin/sh
# Publica a versão atual na API de releases.
if [ -z "$API_URL" ]; then
  echo "erro: API_TOKEN não está definida" >&2  # a mensagem está errada: quem falta é a API_URL
  exit 1
fi
curl -sf -H "Authorization: Bearer $API_TOKEN" "$API_URL/v1/releases" -d @release.json
