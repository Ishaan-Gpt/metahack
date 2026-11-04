# Moovi (metahack) on a plain Linux box: the studio (Next.js) and the edit engine (Node + Python + ffmpeg) in one image.
# Build from the repo root:  docker build -f deploy/Dockerfile -t metahack .
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-numpy curl xz-utils ca-certificates fontconfig \
 && pip3 install --no-cache-dir --break-system-packages opencv-python-headless==4.10.0.84 onnxruntime==1.19.2 pillow \
 && curl -fsSL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ -C /tmp \
 && mv /tmp/ffmpeg-*-static/ffmpeg /tmp/ffmpeg-*-static/ffprobe /usr/local/bin/ && rm -rf /tmp/ffmpeg-* /var/lib/apt/lists/*
ENV PYTHON=python3 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci
COPY . .
RUN cd web && NEXT_DIST_DIR=.next npx next build
EXPOSE 3000
CMD ["node", "web/scripts/dev.mjs", "--prod", "--standin"]
