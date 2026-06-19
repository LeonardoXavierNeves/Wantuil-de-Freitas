#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# Deploy Almoxarifado Wantuil — primeira instalação
#
# IMPORTANTE: rode com o usuário 'wantuil' (NÃO root)
#   su - wantuil
#   bash ~/deploy-app.sh
# ════════════════════════════════════════════════════════════════════

set -e
trap 'echo "❌ Erro na linha $LINENO."' ERR

GRN='\033[1;32m'; YLW='\033[1;33m'; RED='\033[1;31m'; NC='\033[0m'
log()  { echo -e "${GRN}▶ $1${NC}"; }
warn() { echo -e "${YLW}⚠ $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

[ "$EUID" -eq 0 ] && err "NÃO rode como root. Troque com: su - wantuil"

# ─── Coleta info ────────────────────────────────────────────────
echo "╔════════════════════════════════════════════════════╗"
echo "║  Deploy Almoxarifado Wantuil                       ║"
echo "╚════════════════════════════════════════════════════╝"
echo

read -p "👉 Seu domínio (ex: wantuil.org.br): " DOMINIO
read -p "👉 URL do repositório Git (https://...): " REPO_URL
read -p "👉 Branch (Enter pra 'main'): " BRANCH
BRANCH=${BRANCH:-main}

read -sp "👉 Senha do banco wantuil_db (mesma do setup): " PG_PASS
echo

read -p "👉 RESEND_API_KEY (deixe vazio se não vai usar email): " RESEND_KEY
read -p "👉 EMAIL_NOTIFICACOES (e-mail destino dos avisos): " EMAIL_DEST

# Gera JWT_SECRET aleatório (importantíssimo pra segurança)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)

# ─── 1. Clonar projeto ─────────────────────────────────────────
APP_DIR=/var/www/wantuil
log "1/8 Clonando projeto em $APP_DIR..."
cd "$APP_DIR"
if [ -d "almoxarifado-wantuil/.git" ]; then
  cd almoxarifado-wantuil && git fetch && git checkout "$BRANCH" && git pull
else
  rm -rf almoxarifado-wantuil
  git clone -b "$BRANCH" "$REPO_URL" almoxarifado-wantuil
  cd almoxarifado-wantuil
fi

# ─── 2. Backend: .env, install, build, migrações ───────────────
log "2/8 Configurando backend..."
cd "$APP_DIR/almoxarifado-wantuil/backend"

cat > .env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://wantuil_app:$PG_PASS@localhost:5432/wantuil_db
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=https://$DOMINIO
RESEND_API_KEY=$RESEND_KEY
EMAIL_FROM=Almoxarifado <onboarding@resend.dev>
EMAIL_NOTIFICACOES=$EMAIL_DEST
TZ=America/Cuiaba
EOF
chmod 600 .env

log "    Instalando dependências (npm install)... pode levar alguns minutos"
npm ci --omit=dev 2>&1 | tail -3

log "    Gerando cliente Prisma + aplicando schema..."
npx prisma generate
npx prisma db push --accept-data-loss

log "    Compilando backend (build)..."
npm install --include=dev 2>&1 | tail -3  # precisa de devDeps pra buildar
npm run build
# Limpa devDeps depois pra reduzir uso de memória em runtime
npm prune --omit=dev 2>&1 | tail -3

# ─── 3. Frontend: install, build ───────────────────────────────
log "3/8 Configurando frontend..."
cd "$APP_DIR/almoxarifado-wantuil/frontend"

cat > .env.production <<EOF
VITE_API_URL=https://$DOMINIO/api
EOF

log "    Instalando dependências..."
npm ci 2>&1 | tail -3

log "    Compilando frontend (build estático)..."
npm run build

# ─── 4. PM2 — colocar backend pra rodar ────────────────────────
log "4/8 Subindo backend com PM2..."
cd "$APP_DIR/almoxarifado-wantuil/backend"

# Mata se já existir
pm2 delete wantuil-api 2>/dev/null || true

pm2 start dist/main.js --name wantuil-api --max-memory-restart 700M \
  --log /var/log/wantuil-api.log \
  --time
pm2 save

# Configura startup do PM2 pra sobreviver reboot
log "    Configurando inicialização automática..."
PM2_STARTUP_CMD=$(pm2 startup systemd -u wantuil --hp /home/wantuil | grep "^sudo" || true)
if [ -n "$PM2_STARTUP_CMD" ]; then
  echo
  warn "  ✋ EXECUTE ESTE COMANDO COMO ROOT (em outra janela ou com sudo):"
  echo "     $PM2_STARTUP_CMD"
  echo
  read -p "  Apertou Enter pra continuar (depois de rodar o comando acima): " _
fi

# ─── 5. Nginx config ────────────────────────────────────────────
log "5/8 Configurando Nginx (precisa de sudo)..."
sudo tee /etc/nginx/sites-available/wantuil >/dev/null <<EOF
# Almoxarifado Wantuil — config gerada pelo deploy-app.sh

server {
    listen 80;
    listen [::]:80;
    server_name $DOMINIO www.$DOMINIO;

    # Tamanho máximo de upload (importante pra fotos de itens)
    client_max_body_size 10M;

    # Frontend (arquivos estáticos do React)
    root $APP_DIR/almoxarifado-wantuil/frontend/dist;
    index index.html;

    # API — proxy reverso pro NestJS na porta 3000
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
    }

    # SPA routing — todas as rotas que não são /api/ caem no index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)\$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Logs
    access_log /var/log/nginx/wantuil-access.log;
    error_log /var/log/nginx/wantuil-error.log;
}
EOF

sudo ln -sf /etc/nginx/sites-available/wantuil /etc/nginx/sites-enabled/wantuil
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ─── 6. SSL/HTTPS (Let's Encrypt) ───────────────────────────────
log "6/8 Configurando HTTPS (Let's Encrypt)..."
echo
warn "  Para o SSL funcionar, o domínio JÁ TEM que apontar pra esta VPS."
warn "  Se você acabou de configurar o DNS, aguarde ~30 minutos antes."
echo
read -p "  Configurar HTTPS agora? (s/N): " HTTPS_AGORA

if [[ "$HTTPS_AGORA" =~ ^[sS]$ ]]; then
  sudo certbot --nginx -d "$DOMINIO" -d "www.$DOMINIO" --non-interactive --agree-tos --redirect --email "${EMAIL_DEST:-admin@$DOMINIO}" || {
    warn "Certbot falhou. Você pode tentar de novo depois com:"
    echo "  sudo certbot --nginx -d $DOMINIO -d www.$DOMINIO"
  }
fi

# ─── 7. Seed inicial (admin) ────────────────────────────────────
log "7/8 Criando usuário admin (admin@wantuil.org.br / admin123)..."
cd "$APP_DIR/almoxarifado-wantuil/backend"
npx prisma db seed 2>/dev/null || warn "  Seed não rodou (rode manualmente depois se precisar): npx prisma db seed"

# ─── 8. Backup diário do banco ──────────────────────────────────
log "8/8 Configurando backup diário do banco (03h)..."
mkdir -p /var/backups/wantuil
cat > /home/wantuil/backup-db.sh <<EOF
#!/bin/bash
# Backup diário do PostgreSQL — mantém últimos 14 dias
TS=\$(date +%Y%m%d_%H%M%S)
PGPASSWORD='$PG_PASS' pg_dump -h localhost -U wantuil_app wantuil_db | gzip > /var/backups/wantuil/wantuil_\$TS.sql.gz
# Apaga backups com mais de 14 dias
find /var/backups/wantuil -name 'wantuil_*.sql.gz' -mtime +14 -delete
EOF
chmod +x /home/wantuil/backup-db.sh

# Cron — todo dia 3h
(crontab -l 2>/dev/null | grep -v 'backup-db.sh'; echo "0 3 * * * /home/wantuil/backup-db.sh") | crontab -

clear
echo
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║   ✅  Deploy concluído!                            ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo
echo "🌐 Acesse: https://$DOMINIO"
echo "🔐 Login: admin@wantuil.org.br / admin123"
echo
echo "📋 Comandos úteis:"
echo "  pm2 status              # ver se o backend está rodando"
echo "  pm2 logs wantuil-api    # ver logs em tempo real"
echo "  pm2 restart wantuil-api # reiniciar o backend"
echo "  sudo systemctl status nginx  # status do servidor web"
echo "  sudo tail -f /var/log/nginx/wantuil-error.log  # erros do nginx"
echo
echo "🔄 Pra atualizar o sistema depois de mudanças no GitHub:"
echo "  bash ~/update-app.sh"
echo
warn "💡 Mude a senha do admin no primeiro login (Configurações → Usuários)"
echo
