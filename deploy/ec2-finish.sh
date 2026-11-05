#!/usr/bin/env bash
# Finishes a deploy whose image is already built on the EC2 box (metahack:latest): frees the disk the build used
# (temporary swap file, Docker build cache), starts the container without rebuilding, caps it so Moovi keeps its share
# of memory and CPU, adds the HTTPS site block to Moovi's Caddy, and checks the site.
# Run from the repo root on your PC:  & "C:\Program Files\Git\bin\bash.exe" deploy/ec2-finish.sh
set -uo pipefail
KEY=${KEY:-~/.ssh/moovi-ec2.pem}; HOST=${HOST:-ubuntu@65.2.223.240}; SITE=meta.65-2-223-240.sslip.io
ssh -i "$KEY" "$HOST" "bash -s" <<REMOTE
echo "disk before:"; df -h / | tail -1
sudo swapoff /swapfile-metahack 2>/dev/null; sudo rm -f /swapfile-metahack
sudo docker builder prune -af >/dev/null 2>&1
echo "disk after:"; df -h / | tail -1
cd /opt/metahack && sudo docker compose -p metahack -f deploy/metahack.compose.yml up -d --no-build
sudo docker update --memory 900m --memory-swap 1800m --cpus 1.5 metahack-metahack-1 >/dev/null && echo "capped: 900 MB, 1.5 cores"
CF=/opt/moovi/deploy/Caddyfile
if ! grep -q "$SITE" "\$CF"; then
  printf '\n# Edit Easy for the Meta hackathon (metahack), added by deploy/ec2-finish.sh\n%s {\n\tencode zstd gzip\n\treverse_proxy metahack-metahack-1:3000\n}\n' "$SITE" | sudo tee -a "\$CF" >/dev/null
fi
sudo docker exec moovi-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile && echo "caddy reloaded"
for i in \$(seq 30); do c=\$(curl -s -o /dev/null -w "%{http_code}" --resolve "$SITE:443:127.0.0.1" "https://$SITE/api/health"); [ "\$c" = 200 ] && break; sleep 3; done
echo "studio \$c"
sudo docker ps --format "{{.Names}} {{.Status}}" | grep -E "metahack|moovi"
sudo docker logs --tail 8 metahack-metahack-1 2>&1
REMOTE
echo "live: https://$SITE   studio: https://$SITE/studio"
