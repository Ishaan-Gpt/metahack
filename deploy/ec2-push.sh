#!/usr/bin/env bash
# Deploys Edit Easy (metahack) on Moovi's EC2 box, beside Moovi, at https://meta.65-2-223-240.sslip.io.
# Uploads exactly the files the site needs from this checkout (the code, the sample takes, and only the clip files the
# reference players load, about 300 MB), not the whole repo with its GBs of clip data. Moovi is not touched except one
# added site block in its Caddyfile. The image is built on the box (2 cores, ~1 GB free): a temporary 2 GB swap file
# keeps the build from running out of memory and is removed afterwards.
# Run from the repo root on your PC (Git Bash):  bash deploy/ec2-push.sh
set -euo pipefail
KEY=${KEY:-~/.ssh/moovi-ec2.pem}; HOST=${HOST:-ubuntu@65.2.223.240}; SITE=meta.65-2-223-240.sslip.io
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new $HOST"
LIST=$(mktemp)
git ls-files -- . ':!data' ':!import' ':!refs' ':!out' ':!player-em' ':!recreate/ba1/data' > "$LIST"
git ls-files data/samples >> "$LIST"
git ls-files 'data/clips/*/before.mp4' 'data/clips/*/pack.mp4' 'data/clips/*/voice.m4a' 'data/clips/*/aroll.mp4' 'data/clips/*/face.json' 'data/clips/*/moon.png' 'data/clips/ba4c/props/*' >> "$LIST"
for f in data/clips/ba5c/aroll.mp4 data/clips/ba5c/face.json data/clips/ba5c/sb/*; do [ -f "$f" ] && echo "$f" >> "$LIST"; done
echo "uploading $(wc -l < "$LIST") files ($(xargs -d '\n' du -cb < "$LIST" | awk '/total$/{s+=$1} END{printf "%.0f MB", s/1e6}'))"
$SSH 'sudo mkdir -p /opt/metahack.new /opt/metahack-data/jobs /opt/metahack-data/stock /opt/metahack-data/cache && sudo chown -R ubuntu:ubuntu /opt/metahack.new /opt/metahack-data && rm -rf /opt/metahack.new/*'
tar -cf - -T "$LIST" | $SSH 'tar -xf - -C /opt/metahack.new'
scp -i "$KEY" .env.local "$HOST:/opt/metahack.new/.env.local"
rm -f "$LIST"
$SSH "bash -s" <<REMOTE
set -euo pipefail
sudo rm -rf /opt/metahack.old; [ -d /opt/metahack ] && sudo mv /opt/metahack /opt/metahack.old; sudo mv /opt/metahack.new /opt/metahack
if ! sudo swapon --show | grep -q metahack; then sudo fallocate -l 2G /swapfile-metahack && sudo chmod 600 /swapfile-metahack && sudo mkswap -q /swapfile-metahack && sudo swapon /swapfile-metahack; fi
cd /opt/metahack && sudo docker compose -p metahack -f deploy/metahack.compose.yml up -d --build
sudo swapoff /swapfile-metahack && sudo rm -f /swapfile-metahack
CF=/opt/moovi/deploy/Caddyfile
if ! grep -q "$SITE" "\$CF"; then
  printf '\n# Edit Easy for the Meta hackathon (metahack), added by deploy/ec2-push.sh\n%s {\n\tencode zstd gzip\n\treverse_proxy metahack-metahack-1:3000\n}\n' "$SITE" | sudo tee -a "\$CF" >/dev/null
fi
sudo docker exec moovi-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
sleep 8
curl -s -o /dev/null -w "studio %{http_code}\n" --resolve "$SITE:443:127.0.0.1" "https://$SITE/api/health" || true
REMOTE
echo "live: https://$SITE   studio: https://$SITE/studio"
