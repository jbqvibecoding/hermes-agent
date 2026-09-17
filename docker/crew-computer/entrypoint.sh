#!/bin/bash
# Boot sequence for a teammate's computer:
#   X display → VNC → noVNC → headed Chromium (CDP) → CDP relay → stay alive.
#
# The last step matters and differs from a one-shot sandbox image: Hermes runs
# this container with `docker run -d` and then drives it with `docker exec`, so
# PID 1 must keep running for the machine to stay up. `wait` parks here until
# the container is stopped.
set -uo pipefail

export DISPLAY="${DISPLAY:-:99}"
DISPLAY_NUM="${DISPLAY#:}"
GEOMETRY="${SCREEN_GEOMETRY:-1280x800x24}"
WINDOW_SIZE="$(echo "$GEOMETRY" | cut -d'x' -f1),$(echo "$GEOMETRY" | cut -d'x' -f2)"

mkdir -p /workspace/.browser /workspace/files /workspace/screenshots

# An X lock left by the previous run makes Xvfb refuse to start after a restart
# ("Server is already active for display 99") and the whole computer then sits
# in a boot loop. We are the only process in this container at this point, so
# the lock is definitionally stale.
rm -f "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}"
# Chromium's singleton locks are the same story: an unclean exit leaves them
# pointing at a pid that no longer exists, and Chromium then refuses to launch.
rm -f /workspace/.browser/SingletonLock \
      /workspace/.browser/SingletonSocket \
      /workspace/.browser/SingletonCookie

Xvfb "$DISPLAY" -screen 0 "$GEOMETRY" -nolisten tcp &
for _ in $(seq 1 60); do
  xdpyinfo -display "$DISPLAY" >/dev/null 2>&1 && break
  sleep 0.25
done
if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
  echo "[crew-computer] Xvfb failed to start on $DISPLAY" >&2
  exit 1
fi

# -nopw is safe only because the port is published to 127.0.0.1 and never
# beyond it (crew/computer.py). Do not port-forward this.
x11vnc -display "$DISPLAY" -forever -shared -nopw -quiet -rfbport 5900 -bg
websockify --web=/usr/share/novnc 6080 localhost:5900 &

# Headed, not headless: a real window is the whole point — it is what the
# operator sees when they take over to sign in.
#
# Chromium ignores --remote-debugging-address and binds 127.0.0.1 regardless,
# so it listens on 9223 inside and socat relays 9222 outward for the host's
# browser tools to attach to.
chromium \
  --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --remote-debugging-port=9223 \
  --user-data-dir=/workspace/.browser \
  --window-position=0,0 --window-size="$WINDOW_SIZE" \
  --no-first-run --no-default-browser-check --disable-features=Translate \
  about:blank &

socat TCP-LISTEN:9222,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:9223 &

echo "[crew-computer] ready — screen on :6080, CDP on :9222"
wait
