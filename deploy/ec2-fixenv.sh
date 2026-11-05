#!/usr/bin/env bash
# Live fix for the AWS studio, no rebuild: removes an empty MODEL_API_KEY= line from the server's .env.local (Docker's
# env_file turned it into an empty key, so the engine stopped at "direct" with exit 2), recreates the container from the
# built image, re-applies the memory and CPU caps, and checks the site.
# Run from the repo root on your PC:  & "C:\Program Files\Git\bin\bash.exe" deploy/ec2-fixenv.sh
set -uo pipefail
KEY=${KEY:-~/.ssh/moovi-ec2.pem}; HOST=${HOST:-ubuntu@65.2.223.240}
ssh -i "$KEY" "$HOST" 'bash -s' <<'REMOTE'
sed -i '/^[[:space:]]*MODEL_API_KEY[[:space:]]*=[[:space:]]*$/d' /opt/metahack/.env.local
echo "empty key lines left: $(grep -cE '^[[:space:]]*MODEL_API_KEY[[:space:]]*=[[:space:]]*$' /opt/metahack/.env.local)"
cd /opt/metahack && sudo docker compose -p metahack -f deploy/metahack.compose.yml up -d --no-build --force-recreate
sudo docker update --memory 900m --memory-swap 1800m --cpus 1.5 metahack-metahack-1 >/dev/null && echo "capped: 900 MB, 1.5 cores"
for i in $(seq 30); do c=$(curl -s -o /dev/null -w "%{http_code}" --resolve "meta.65-2-223-240.sslip.io:443:127.0.0.1" "https://meta.65-2-223-240.sslip.io/api/health"); [ "$c" = 200 ] && break; sleep 2; done
echo "studio $c"
REMOTE
