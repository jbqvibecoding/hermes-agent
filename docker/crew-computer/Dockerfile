# Hermes Crew — one computer per teammate.
#
# A teammate's container is an ordinary Hermes Docker sandbox (started with
# `docker run -d`, driven with `docker exec`, workspace persisted by
# tools/environments/docker.py) with three things added on top:
#
#   * a headed Chromium under Xvfb, so login-walled sites work at all;
#   * that same X display served over noVNC, so the operator can take the
#     wheel and sign in — the one thing a pure API/MCP agent cannot do;
#   * Chromium's CDP port relayed to 0.0.0.0 so Hermes's browser tools can
#     attach from the host.
#
# Shell and file access need nothing here: `docker exec` already provides them.
#
# The base image is deliberately small. Do NOT switch to
# mcr.microsoft.com/playwright (2GB+) — this is meant to run on a mini PC or a
# $5 VPS alongside several siblings.
FROM debian:bookworm-slim

# Official Debian mirrors run at a few tens of KB/s in some regions. Pass a
# mirror host to build at a sane speed:
#   docker build --build-arg APT_MIRROR=mirrors.aliyun.com -t hermes/crew-computer docker/crew-computer
ARG APT_MIRROR=""

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:99 \
    SCREEN_GEOMETRY=1280x800x24

RUN if [ -n "$APT_MIRROR" ]; then \
      for f in /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources; do \
        [ -f "$f" ] && sed -i "s|deb.debian.org|$APT_MIRROR|g; s|security.debian.org|$APT_MIRROR|g" "$f"; \
      done; \
    fi \
 && apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      xvfb x11-utils x11vnc \
      novnc websockify socat \
      ca-certificates fonts-liberation procps \
      bash coreutils curl git jq ripgrep python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

WORKDIR /workspace

# 6080 noVNC (the screen), 9222 CDP (the browser tools).
# Both are published to 127.0.0.1 only — see crew/computer.py.
EXPOSE 6080 9222

CMD ["/opt/entrypoint.sh"]
