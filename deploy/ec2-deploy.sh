#!/usr/bin/env bash
# Deploys Moovi (metahack) on Moovi's EC2 box, beside Moovi, at https://meta.65-2-223-240.sslip.io (Caddy fetches the
# certificate). Moovi itself is not touched except one added site block in its Caddyfile.
# Run from the repo root on your PC (Git Bash):
#   scp -i ~/.ssh/moovi-ec2.pem .env.local ubuntu@65.2.223.240:/tmp/metahack.env
#   ssh -i ~/.ssh/moovi-ec2.pem ubuntu@65.2.223.240 'bash -s' < deploy/ec2-deploy.sh
set -euo pipefail
SITE=meta.65-2-223-240.sslip.io
sudo mkdir -p /opt/metahack /opt/metahack-data/jobs /opt/metahack-data/stock /opt/metahack-data/cache
sudo chown -R ubuntu:ubuntu /opt/metahack /opt/metahack-data
cd /opt/metahack
# code: a shallow, sparse checkout (the app's folders only, not the heavy clip data)
if [ ! -d .git ]; then git init -q && git remote add origin https://github.com/Ishaan-Gpt/metahack.git; fi
git sparse-checkout init --no-cone
printf '/*\n!/data/*\n/data/samples/\n!/recreate/\n!/import/\n!/refs/\n!/out/\n!/player-em/\n' > .git/info/sparse-checkout
git fetch -q --depth 1 origin main && git checkout -q -f FETCH_HEAD
# keys (GROQ for word timings now; MODEL_API_KEY for Meta when you add it)
if [ -f /tmp/metahack.env ]; then mv /tmp/metahack.env /opt/metahack/.env.local; fi
touch /opt/metahack/.env.local
# build and start (the build takes 10-15 min on this box)
sudo docker compose -p metahack -f deploy/metahack.compose.yml up -d --build
# HTTPS: one more site in Moovi's Caddy, then a graceful reload
CF=/opt/moovi/deploy/Caddyfile
if ! grep -q "$SITE" "$CF"; then
  printf '\n# Moovi for the Meta hackathon (metahack), added by deploy/ec2-deploy.sh\n%s {\n\tencode zstd gzip\n\treverse_proxy metahack-metahack-1:3000\n}\n' "$SITE" | sudo tee -a "$CF" >/dev/null
fi
sudo docker exec moovi-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
sleep 5
curl -s -o /dev/null -w "local studio %{http_code}\n" --resolve "$SITE:443:127.0.0.1" "https://$SITE/api/health" || true
echo "live: https://$SITE   studio: https://$SITE/studio"
