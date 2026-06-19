#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# Update Almoxarifado Wantuil — depois de mudanças no GitHub
# Use quando quiser atualizar a versão do sistema na VPS.
#
# Como usar (logado como 'wantuil'):
#   bash ~/update-app.sh
# ════════════════════════════════════════════════════════════════════

set -e
trap 'echo "❌ Erro na linha $LINENO."' ERR

GRN='\033[1;32m'; YLW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GRN}▶ $1${NC}"; }

APP_DIR=/var/www/wantuil/almoxarifado-wantuil

[ -d "$APP_DIR" ] || { echo "❌ App não encontrado em $APP_DIR. Rode deploy-app.sh primeiro."; exit 1; }

echo "╔════════════════════════════════════════════════════╗"
echo "║  Atualizando Almoxarifado Wantuil                 ║"
echo "╚════════════════════════════════════════════════════╝"
echo

# ─── Backup do banco antes de atualizar (segurança) ─────────────
log "Fazendo backup do banco (segurança)..."
~/backup-db.sh

# ─── Puxa mudanças do Git ───────────────────────────────────────
log "Puxando atualizações do GitHub..."
cd "$APP_DIR"
git fetch
git pull

# ─── Backend ────────────────────────────────────────────────────
log "Atualizando backend..."
cd "$APP_DIR/backend"
npm install --include=dev 2>&1 | tail -3
npx prisma generate
npx prisma db push --accept-data-loss
npm run build
npm prune --omit=dev 2>&1 | tail -3

log "Reiniciando backend (PM2)..."
pm2 restart wantuil-api

# ─── Frontend ───────────────────────────────────────────────────
log "Atualizando frontend..."
cd "$APP_DIR/frontend"
npm ci 2>&1 | tail -3
npm run build

# ─── Recarrega nginx (não precisa, mas por segurança) ───────────
log "Recarregando Nginx..."
sudo systemctl reload nginx

echo
echo "╔════════════════════════════════════════════════════╗"
echo "║   ✅  Atualização concluída!                       ║"
echo "╚════════════════════════════════════════════════════╝"
echo
echo "▶ Verifique se está tudo OK:"
echo "  pm2 status"
echo "  pm2 logs wantuil-api --lines 20"
echo
