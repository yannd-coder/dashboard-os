#!/usr/bin/env bash
# ============================================================================
# YANN OS — Sync centralisé des secrets
# ============================================================================
# Lit secrets/secrets.txt et propage chaque secret vers tous les bons endroits :
#   - .env local (Vite build, scripts Python)
#   - Supabase Edge Functions secrets (DASHBOARD_AGENTS_ANTHROPIC_KEY, N8N_WEBHOOK_*)
#   - GitHub Actions secrets (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, N8N_WEBHOOK_SECRET)
#   - VPS /root/dashboard-os/.env (via SSH si accessible)
#
# Usage :
#   bash scripts/sync-secrets.sh              # propagation réelle
#   bash scripts/sync-secrets.sh --dry-run    # affiche ce qui serait fait, sans rien faire
#
# Pré-requis :
#   - supabase CLI loggué (supabase login)
#   - gh CLI loggué (gh auth login)  — pour GH Actions secrets
#   - ~/.ssh/hostinger_vps configuré — pour push VPS (échec silencieux si VPS injoignable)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_FILE="$ROOT_DIR/secrets/secrets.txt"
SUPABASE_PROJECT_REF="flqjaqocsugwbkbiuhhk"
GITHUB_REPO="yannd-coder/dashboard-os"

DRY_RUN=""
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN="dry-run"

# --- Helpers --------------------------------------------------------------

cyan() { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*" >&2; }

run() {
  if [[ -n "$DRY_RUN" ]]; then
    yellow "  [dry-run] $*"
  else
    "$@"
  fi
}

# --- Pré-flight -----------------------------------------------------------

if [[ ! -f "$SECRETS_FILE" ]]; then
  red "ERROR: $SECRETS_FILE introuvable."
  red "Copie secrets/secrets.txt.example vers secrets/secrets.txt et remplis les valeurs."
  exit 1
fi

# Source le fichier en mode sûr
set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

[[ -n "$DRY_RUN" ]] && yellow "[DRY-RUN MODE — aucune modification réelle]"
cyan "==> Sync depuis $SECRETS_FILE"
echo ""

# --- 1. .env local (Vite + scripts Python) --------------------------------
cyan "1. Update .env local (Vite build + scripts)"
if [[ -z "$DRY_RUN" ]]; then
  cat > "$ROOT_DIR/.env" <<EOF
VITE_APP_NAME=$VITE_APP_NAME
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
N8N_API_KEY=$N8N_API_KEY
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
CPANEL_HOST=$CPANEL_HOST
CPANEL_USER=$CPANEL_USER
CPANEL_PASS=$CPANEL_PASS
CPANEL_API_TOKEN=$CPANEL_API_TOKEN
EOF
  green "   ✓ .env updated ($(wc -l < "$ROOT_DIR/.env") lines)"
else
  yellow "   [dry-run] would write $ROOT_DIR/.env"
fi
echo ""

# --- 2. Supabase Edge Functions secrets -----------------------------------
cyan "2. Push to Supabase Edge Functions"
if ! command -v supabase &> /dev/null; then
  red "   ✗ supabase CLI not found. Install : brew install supabase/tap/supabase"
else
  run supabase secrets set \
    "DASHBOARD_AGENTS_ANTHROPIC_KEY=$DASHBOARD_AGENTS_ANTHROPIC_KEY" \
    "N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL" \
    "N8N_WEBHOOK_SECRET=$N8N_WEBHOOK_SECRET" \
    --project-ref "$SUPABASE_PROJECT_REF"
  [[ -z "$DRY_RUN" ]] && green "   ✓ Supabase secrets pushed"
fi
echo ""

# --- 3. GitHub Actions secrets --------------------------------------------
cyan "3. Push to GitHub Actions (repo $GITHUB_REPO)"
if ! command -v gh &> /dev/null; then
  yellow "   ⚠ gh CLI not found, skipped. Install : brew install gh && gh auth login"
elif ! gh auth status &>/dev/null; then
  yellow "   ⚠ gh not authenticated. Run : gh auth login"
else
  for key in VITE_APP_NAME VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY N8N_WEBHOOK_SECRET; do
    val="${!key:-}"
    if [[ -z "$val" ]]; then
      yellow "   ⚠ $key empty, skipped"
      continue
    fi
    if [[ -n "$DRY_RUN" ]]; then
      yellow "   [dry-run] gh secret set $key (length=${#val})"
    else
      echo "$val" | gh secret set "$key" -R "$GITHUB_REPO" 2>&1 | sed 's/^/   /'
    fi
  done
  [[ -z "$DRY_RUN" ]] && green "   ✓ GH Actions secrets pushed"
fi
echo ""

# --- 4. VPS /root/dashboard-os/.env ---------------------------------------
cyan "4. Push to VPS $VPS_HOST"
SSH_KEY="${VPS_SSH_KEY_PATH/#\~/$HOME}"
if [[ ! -f "$SSH_KEY" ]]; then
  yellow "   ⚠ SSH key not found at $SSH_KEY, skipped"
elif ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes "$VPS_USER@$VPS_HOST" 'exit' &>/dev/null; then
  yellow "   ⚠ VPS unreachable (Starlink filter ? VPN not on ?), skipped"
  yellow "     → Run again from a non-Starlink connection, or push manually."
else
  if [[ -n "$DRY_RUN" ]]; then
    yellow "   [dry-run] would scp .env to VPS:/root/dashboard-os/.env"
  else
    cat > /tmp/vps_env <<EOF
VITE_APP_NAME=$VITE_APP_NAME
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL
N8N_WEBHOOK_SECRET=$N8N_WEBHOOK_SECRET
EOF
    scp -i "$SSH_KEY" -q /tmp/vps_env "$VPS_USER@$VPS_HOST:/root/dashboard-os/.env"
    rm -f /tmp/vps_env
    green "   ✓ VPS .env updated"
  fi
fi
echo ""

# --- Done -----------------------------------------------------------------
green "============================================="
green "  Sync done."
green "============================================="
echo ""
echo "Pour les services qui ont besoin du nouveau .env :"
echo "  • Vite local : redémarrer (Ctrl+C puis npm run dev)"
echo "  • Supabase Edge Functions : auto (secrets relus à chaque invocation)"
echo "  • VPS containers : ssh root@$VPS_HOST 'cd /root/dashboard-os && docker compose up -d'"
echo "  • GH Actions : les prochains workflows utiliseront les nouvelles valeurs"
