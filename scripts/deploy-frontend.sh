#!/usr/bin/env bash
set -euo pipefail

# Deploy the frontend build to a server directory and start/restart it with PM2.
#
# Local deploy (default):
#   pnpm deploy:frontend
#   TARGET_FRONTEND_DIR=/custom/path pnpm deploy:frontend
#
# Remote deploy via SSH/SCP:
#   DEPLOY_HOST=1.2.3.4 pnpm deploy:frontend
#   DEPLOY_HOST=1.2.3.4 DEPLOY_USER=root DEPLOY_KEY=~/.ssh/id_rsa pnpm deploy:frontend
#
# When password authentication is needed and no SSH key is provided, the script
# will prompt for the password once and use sshpass (if installed) to avoid
# multiple password prompts.

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-22}"
DEPLOY_KEY="${DEPLOY_KEY:-}"
DEPLOY_PASSWORD="${DEPLOY_PASSWORD:-}"
TARGET_FRONTEND_DIR="${TARGET_FRONTEND_DIR:-${TARGET_DIR:-/root/server-tools/bookmark-nav-frontend-build}}"
TARGET_DIR="$TARGET_FRONTEND_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Load optional deploy environment config (e.g. DEPLOY_HOST, DEPLOY_SSH_PORT).
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$SCRIPT_DIR/deploy.env}"
if [ -f "$DEPLOY_ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$DEPLOY_ENV_FILE"
  set +a
fi
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-$FRONTEND_DIR/.env}"

# If deploying locally to a protected directory (e.g. under /root), re-run the
# whole script with sudo while preserving PATH so pnpm/corepack stay available.
maybe_sudo() {
  if [ -z "$DEPLOY_HOST" ] && [ "$EUID" -ne 0 ]; then
    local parent
    parent=$(dirname "$TARGET_DIR")
    if { [ -e "$TARGET_DIR" ] && [ ! -w "$TARGET_DIR" ]; } || [ ! -w "$parent" ]; then
      echo "==> Target directory requires root privileges, re-running with sudo..."
      exec sudo -E env PATH="$PATH" "$0" "$@"
    fi
  fi
}
maybe_sudo "$@"

resolve_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    command -v pnpm
    return
  fi

  # When run via sudo, the original user's PATH may contain pnpm/corepack.
  if [ -n "${SUDO_USER:-}" ]; then
    local user_pnpm
    user_pnpm=$(sudo -u "$SUDO_USER" env PATH="$PATH" sh -c 'command -v pnpm' 2>/dev/null || true)
    if [ -n "$user_pnpm" ]; then
      echo "$user_pnpm"
      return
    fi
    local user_corepack
    user_corepack=$(sudo -u "$SUDO_USER" env PATH="$PATH" sh -c 'command -v corepack' 2>/dev/null || true)
    if [ -n "$user_corepack" ]; then
      echo "$user_corepack pnpm"
      return
    fi
  fi

  if command -v corepack >/dev/null 2>&1 && corepack pnpm --version >/dev/null 2>&1; then
    echo "corepack pnpm"
    return
  fi

  echo "ERROR: pnpm is not installed. Run 'corepack enable' or install pnpm." >&2
  exit 1
}

PNPM_CMD=$(resolve_pnpm)

if [ ! -f "$FRONTEND_ENV_FILE" ]; then
  echo "ERROR: Frontend environment file not found: $FRONTEND_ENV_FILE" >&2
  exit 1
fi

echo "==> Building frontend..."
$PNPM_CMD --filter @loomark/frontend build

STANDALONE_DIR="$FRONTEND_DIR/.next/standalone"
if [ ! -d "$STANDALONE_DIR" ]; then
  echo "ERROR: $STANDALONE_DIR not found. Make sure next.config.ts uses output: 'standalone'." >&2
  exit 1
fi

stage_artifacts() {
  local out_dir="$1"
  mkdir -p "$out_dir"

  # Copy the entire standalone tree (monorepo root with shared node_modules).
  rm -rf "$out_dir/"*
  cp -R "$STANDALONE_DIR/"* "$out_dir/"

  # Next.js standalone does not copy static assets or public files by default.
  mkdir -p "$out_dir/frontend/.next/static"
  cp -R "$FRONTEND_DIR/.next/static/"* "$out_dir/frontend/.next/static/"

  if [ -d "$FRONTEND_DIR/public" ] && [ "$(ls -A "$FRONTEND_DIR/public")" ]; then
    mkdir -p "$out_dir/frontend/public"
    cp -R "$FRONTEND_DIR/public/." "$out_dir/frontend/public/"
  fi

  cp "$FRONTEND_DIR/ecosystem.config.cjs" "$out_dir/ecosystem.config.cjs"
  cp "$FRONTEND_ENV_FILE" "$out_dir/.env"
  chmod 600 "$out_dir/.env"
}

create_archive() {
  tar -czf "$2" -C "$1" .
}

run_pm2_local() {
  local target="$1"
  local pm2_cmd="${PM2_CMD:-$(command -v pm2 || true)}"
  if [ -z "$pm2_cmd" ]; then
    if [ -n "$PNPM_CMD" ]; then
      pm2_cmd="$PNPM_CMD exec pm2"
    elif command -v npx >/dev/null 2>&1; then
      pm2_cmd="npx pm2"
    else
      echo "ERROR: pm2 is not installed. Install it globally or set PM2_CMD." >&2
      exit 1
    fi
  fi
  # Stop any existing instance first to avoid EADDRINUSE on restart.
  $pm2_cmd delete bookmark-nav-frontend >/dev/null 2>&1 || true
  sleep 1
  $pm2_cmd start "$target/ecosystem.config.cjs" --env production
}

deploy_local() {
  local target="$TARGET_DIR"

  echo "==> Preparing deploy directory: $target"
  if ! mkdir -p "$target" 2>/dev/null; then
    echo "ERROR: Cannot create $target. Run with sudo or set DEPLOY_HOST for remote deploy." >&2
    exit 1
  fi

  stage_artifacts "$target"

  echo "==> Deploying with PM2..."
  run_pm2_local "$target"

  echo "==> Frontend deployed to $target"
}

remote_ssh_cmd() {
  local opts="-p $DEPLOY_SSH_PORT -o BatchMode=no -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
  [ -n "$DEPLOY_KEY" ] && opts="$opts -i $DEPLOY_KEY"
  echo "ssh $opts $DEPLOY_USER@$DEPLOY_HOST"
}

remote_scp_cmd() {
  local opts="-P $DEPLOY_SSH_PORT -o BatchMode=no -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
  [ -n "$DEPLOY_KEY" ] && opts="$opts -i $DEPLOY_KEY"
  echo "scp $opts"
}

run_remote() {
  local cmd="$1"
  if [ -n "$DEPLOY_KEY" ]; then
    $(remote_ssh_cmd) "bash -lc $(printf '%q' "$cmd")"
    return
  fi

  if ! command -v sshpass >/dev/null 2>&1; then
    echo "ERROR: SSH password authentication requires sshpass." >&2
    echo "Install it (e.g. 'sudo apt install sshpass') or use DEPLOY_KEY." >&2
    exit 1
  fi

  if [ -z "$DEPLOY_PASSWORD" ]; then
    read -s -p "Enter SSH password for $DEPLOY_USER@$DEPLOY_HOST: " DEPLOY_PASSWORD
    echo
  fi

  SSHPASS="$DEPLOY_PASSWORD" sshpass -e $(remote_ssh_cmd) "bash -lc $(printf '%q' "$cmd")"
}

upload_archive() {
  local archive="$1"
  local dest="$2"

  if [ -n "$DEPLOY_KEY" ]; then
    $(remote_scp_cmd) "$archive" "$dest"
    return
  fi

  if ! command -v sshpass >/dev/null 2>&1; then
    echo "ERROR: SSH password authentication requires sshpass." >&2
    echo "Install it (e.g. 'sudo apt install sshpass') or use DEPLOY_KEY." >&2
    exit 1
  fi

  if [ -z "$DEPLOY_PASSWORD" ]; then
    read -s -p "Enter SSH password for $DEPLOY_USER@$DEPLOY_HOST: " DEPLOY_PASSWORD
    echo
  fi

  SSHPASS="$DEPLOY_PASSWORD" sshpass -e $(remote_scp_cmd) "$archive" "$dest"
}

deploy_remote() {
  local user="$DEPLOY_USER"
  local host="$DEPLOY_HOST"
  local remote_dir="$TARGET_DIR"

  local tmp_dir=""
  local archive=""

  cleanup_remote() {
    local exit_code=$?
    [ -n "${tmp_dir:-}" ] && rm -rf "$tmp_dir" || true
    [ -n "${archive:-}" ] && rm -f "$archive" || true
    return $exit_code
  }
  trap cleanup_remote EXIT

  tmp_dir=$(mktemp -d /tmp/bookmark-nav-frontend-deploy-XXXXXX)
  archive=$(mktemp /tmp/bookmark-nav-frontend-XXXXXX.tar.gz)

  echo "==> Staging artifacts..."
  stage_artifacts "$tmp_dir"

  echo "==> Creating deploy archive..."
  create_archive "$tmp_dir" "$archive"

  echo "==> Creating remote directory..."
  run_remote "mkdir -p $remote_dir"

  echo "==> Uploading build archive to $user@$host:$remote_dir ..."
  upload_archive "$archive" "$user@$host:$remote_dir/deploy.tar.gz"

  echo "==> Installing and restarting on remote..."
  run_remote "
    set -e
    cd $remote_dir
    find . -mindepth 1 -maxdepth 1 ! -name 'deploy.tar.gz' -exec rm -rf {} +
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz
    if command -v pm2 >/dev/null 2>&1; then
      pm2 delete bookmark-nav-frontend >/dev/null 2>&1 || true
      sleep 1
      pm2 start ecosystem.config.cjs --env production
    else
      npx pm2 delete bookmark-nav-frontend >/dev/null 2>&1 || true
      sleep 1
      npx pm2 start ecosystem.config.cjs --env production
    fi
  "

  echo "==> Frontend deployed to $user@$host:$remote_dir"
}

if [ -n "$DEPLOY_HOST" ]; then
  deploy_remote
else
  deploy_local
fi
