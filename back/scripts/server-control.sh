#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.server.pid"
LOG_FILE="$ROOT/.server.log"
META_FILE="$ROOT/.server.meta"
SERVER_PATTERN="node .*server\\.js"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-5000}"

read_pid() {
  if [[ -f "$PID_FILE" ]]; then
    cat "$PID_FILE"
  fi
}

is_running() {
  local pid="${1:-}"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return 1
  fi

  local cmdline=""
  if [[ -r "/proc/$pid/cmdline" ]]; then
    cmdline="$(tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null || true)"
  fi

  [[ "$cmdline" == *"server.js"* ]]
}

find_server_pid() {
  local pid=""

  pid="$(read_pid || true)"
  if is_running "$pid"; then
    echo "$pid"
    return 0
  fi

  pid="$(pgrep -f "$SERVER_PATTERN" | tail -n 1 || true)"
  if is_running "$pid"; then
    echo "$pid"
    return 0
  fi

  return 1
}

clear_pid_file() {
  rm -f "$PID_FILE"
}

write_meta_file() {
  cat >"$META_FILE" <<EOF
HOST=$HOST
PORT=$PORT
URL=http://$HOST:$PORT
EOF
}

read_url() {
  if [[ -f "$META_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$META_FILE"
    echo "${URL:-http://$HOST:$PORT}"
    return
  fi

  echo "http://$HOST:$PORT"
}

start_server() {
  local pid
  pid="$(find_server_pid || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid" >"$PID_FILE"
    echo "Backend already running with PID $pid"
    echo "URL: $(read_url)"
    echo "Log file: $LOG_FILE"
    exit 0
  fi

  clear_pid_file
  touch "$LOG_FILE"
  write_meta_file

  (
    cd "$ROOT"
    nohup node server.js >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  sleep 1

  pid="$(find_server_pid || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid" >"$PID_FILE"
    echo "Backend started with PID $pid"
    echo "URL: $(read_url)"
    echo "Log file: $LOG_FILE"
    exit 0
  fi

  clear_pid_file
  echo "Backend failed to start"
  echo "Log file: $LOG_FILE"
  exit 1
}

stop_server() {
  local pid
  pid="$(find_server_pid || true)"
  if [[ -z "$pid" ]]; then
    clear_pid_file
    echo "Backend is not running"
    exit 0
  fi

  kill "$pid"

  for _ in {1..20}; do
    if ! is_running "$pid"; then
      clear_pid_file
      echo "Stopped backend PID $pid"
      exit 0
    fi
    sleep 0.1
  done

  echo "Backend PID $pid did not stop cleanly"
  exit 1
}

status_server() {
  local pid
  pid="$(find_server_pid || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid" >"$PID_FILE"
    echo "Backend is running with PID $pid"
    echo "URL: $(read_url)"
    echo "Log file: $LOG_FILE"
    exit 0
  fi

  clear_pid_file
  echo "Backend is not running"
}

case "${1:-}" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server || true
    start_server
    ;;
  status)
    status_server
    ;;
  *)
    echo "Usage: bash scripts/server-control.sh <start|stop|restart|status>"
    exit 1
    ;;
esac
