#!/usr/bin/env bash
# Hot fix for the AWS studio, no image rebuild: removes an empty MODEL_API_KEY= line from the server's .env.local,
# recreates the container from the built image with the caps, then copies the current engine files into it (each new
# job runs engine/*.mjs fresh, so no restart is needed for them) and into /opt/metahack for the next full build.
# Run from the repo root on your PC:  & "C:\Program Files\Git\bin\bash.exe" deploy/ec2-hotfix.sh
set -uo pipefail
KEY=${KEY:-~/.ssh/moovi-ec2.pem}; HOST=${HOST:-ubuntu@65.2.223.240}
FILES="engine/meta.mjs engine/muse.mjs engine/card-studio.mjs engine/run.mjs engine/edits.mjs engine/preview.mjs web/scripts/dev.mjs"
tar -cf - $FILES | ssh -i "$KEY" "$HOST" 'tar -xf - -C /opt/metahack'
ssh -i "$KEY" "$HOST" 'bash -s' <<REMOTE
sed -i '/^[[:space:]]*MODEL_API_KEY[[:space:]]*=[[:space:]]*\$/d' /opt/metahack/.env.local
cd /opt/metahack && sudo docker compose -p metahack -f deploy/metahack.compose.yml up -d --no-build --force-recreate
sudo docker update --memory 900m --memory-swap 1800m --cpus 1.5 metahack-metahack-1 >/dev/null && echo "capped: 900 MB, 1.5 cores"
for f in $FILES; do sudo docker cp "/opt/metahack/\$f" "metahack-metahack-1:/app/\$f"; done && echo "engine files updated"
for i in \$(seq 30); do c=\$(curl -s -o /dev/null -w "%{http_code}" --resolve "meta.65-2-223-240.sslip.io:443:127.0.0.1" "https://meta.65-2-223-240.sslip.io/api/health"); [ "\$c" = 200 ] && break; sleep 2; done
echo "studio \$c"
REMOTE
