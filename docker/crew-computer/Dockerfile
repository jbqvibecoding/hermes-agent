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
      `# Worth the megabytes despite the "keep it small" rule above: without` \
      `# CJK glyphs a Chinese page renders as tofu boxes on the screen the` \
      `# operator is watching, and a generated deck is unreadable.` \
      fonts-noto-cjk \
      bash coreutils curl git jq ripgrep python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*

# A teammate asked for "a deck" writes a script and runs it, so the libraries
# have to be in the container rather than reachable from it. These are the
# upstream projects (all MIT/BSD), not a vendored skill: file generation is a
# solved problem and the interesting part is what goes in the file.
#
# A venv rather than `pip install --break-system-packages`: Debian bookworm
# marks its Python externally managed (PEP 668), and overriding that puts the
# teammate one `pip install` away from breaking apt's own Python.
#
# `--system-site-packages` so the venv still sees anything apt provides; on
# PATH so a plain `python3` in a teammate's script finds them without it having
# to know the venv is there.
ENV VIRTUAL_ENV=/opt/crew-venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN python3 -m venv --system-site-packages "$VIRTUAL_ENV" \
 && "$VIRTUAL_ENV/bin/pip" install --no-cache-dir --upgrade pip \
 && "$VIRTUAL_ENV/bin/pip" install --no-cache-dir \
      python-pptx \
      python-docx \
      openpyxl \
      pypdf \
      pillow

COPY entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

WORKDIR /workspace

# 6080 noVNC (the screen), 9222 CDP (the browser tools).
# Both are published to 127.0.0.1 only — see crew/computer.py.
EXPOSE 6080 9222

CMD ["/opt/entrypoint.sh"]
