#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# Setup VPS — Sistema de Almoxarifado Wantuil de Freitas
# Para: Ubuntu 24.04 LTS na Hostinger (KVM 1)
#
# Instala: Node.js 20, PostgreSQL 16, Nginx, PM2, Certbot,
#          firewall (UFW), proteção brute-force (fail2ban)
# Cria:    usuário 'wantuil' (não-root), banco de dados, swap
#
# Como usar:
#   1. Conecte-se na VPS como root (instruções no DEPLOY_VPS.md)
#   2. Faça upload deste arquivo (ou cole em /root/setup-vps.sh)
#   3. Rode: bash /root/setup-vps.sh
# ════════════════════════════════════════════════════════════════════

set -e  # para se algum comando falhar
trap 'echo "❌ Erro na linha $LINENO. Setup interrompido."' ERR

# Cores pra output legível
GRN='\033[1;32m'; YLW='\033[1;33m'; RED='\033[1;31m'; NC='\033[0m'
log()  { echo -e "${GRN}▶ $1${NC}"; }
warn() { echo -e "${YLW}⚠ $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

[ "$EUID" -eq 0 ] || err "Rode como root: sudo bash $0"

clear
echo "╔════════════════════════════════════════════════════╗"
echo "║  Setup VPS — Almoxarifado Wantuil de Freitas      ║"
echo "║  Esse script vai levar ~10 minutos                ║"
echo "╚════════════════════════════════════════════════════╝"
echo

# ─── Coleta informações ─────────────────────────────────────────
read -p "👉 Seu domínio (ex: wantuil.org.br): " DOMINIO
[ -z "$DOMINIO" ] && err "Domínio é obrigatório"

read -p "👉 E-mail para certificado SSL (Let's Encrypt): " EMAIL
[ -z "$EMAIL" ] && err "E-mail é obrigatório"

read -sp "👉 Senha para o banco de dados PostgreSQL (anote!): " PG_PASS
echo
[ ${#PG_PASS} -lt 8 ] && err "Senha precisa ter pelo menos 8 caracteres"

read -sp "👉 Senha para o usuário 'wantuil' do servidor (anote!): " USER_PASS
echo
[ ${#USER_PASS} -lt 8 ] && err "Senha precisa ter pelo menos 8 caracteres"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Confirme:"
echo "  Domínio: $DOMINIO"
echo "  E-mail:  $EMAIL"
echo "  Banco e usuário do sistema serão criados."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Tudo certo? (s/N): " CONFIRMA
[[ ! "$CONFIRMA" =~ ^[sS]$ ]] && err "Cancelado pelo usuário"

# ─── 1. Atualizar sistema ───────────────────────────────────────
log "1/10 Atualizando o sistema operacional..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# Pacotes basicos
apt-get install -y -qq \
  curl wget git nano htop \
  build-essential ca-certificates gnupg lsb-release \
  ufw fail2ban unattended-upgrades

# ─── 2. Criar swap (vps com 4GB se beneficia) ───────────────────
log "2/10 Configurando memória swap (4GB)..."
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p >/dev/null
fi

# ─── 3. Node.js 20 LTS ──────────────────────────────────────────
log "3/10 Instalando Node.js 20 (LTS)..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
fi
echo "  Node $(node --version), npm $(npm --version)"
npm install -g pm2 >/dev/null 2>&1

# ─── 4. PostgreSQL 16 ───────────────────────────────────────────
log "4/10 Instalando PostgreSQL 16..."
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable --now postgresql

# Cria usuario e banco de dados
sudo -u postgres psql <<EOF >/dev/null
CREATE USER wantuil_app WITH PASSWORD '$PG_PASS';
CREATE DATABASE wantuil_db OWNER wantuil_app;
GRANT ALL PRIVILEGES ON DATABASE wantuil_db TO wantuil_app;
\c wantuil_db
GRANT ALL ON SCHEMA public TO wantuil_app;
EOF
echo "  Banco wantuil_db criado, usuário wantuil_app"

# ─── 5. Nginx ───────────────────────────────────────────────────
log "5/10 Instalando Nginx..."
apt-get install -y -qq nginx
systemctl enable --now nginx

# ─── 6. Certbot (HTTPS gratuito via Let's Encrypt) ──────────────
log "6/10 Instalando Certbot (HTTPS)..."
apt-get install -y -qq certbot python3-certbot-nginx

# ─── 7. Usuário não-root para a aplicação ──────────────────────
log "7/10 Criando usuário 'wantuil' (não-root)..."
if ! id -u wantuil >/dev/null 2>&1; then
  useradd -m -s /bin/bash wantuil
  echo "wantuil:$USER_PASS" | chpasswd
  usermod -aG sudo wantuil
fi

# ─── 8. Firewall + Fail2ban ─────────────────────────────────────
log "8/10 Configurando firewall (UFW) + fail2ban..."
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

# fail2ban config basica
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban >/dev/null

# ─── 9. Atualizações automáticas de segurança ───────────────────
log "9/10 Habilitando atualizações automáticas de segurança..."
echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades

# ─── 10. Estrutura de pastas da aplicação ──────────────────────
log "10/10 Preparando pastas da aplicação..."
mkdir -p /var/www/wantuil /var/backups/wantuil
chown -R wantuil:wantuil /var/www/wantuil /var/backups/wantuil

# ─── Salva config para uso posterior ────────────────────────────
cat > /root/wantuil-config.txt <<EOF
═══════════════════════════════════════════════════════════════
CONFIGURAÇÃO DA VPS — Almoxarifado Wantuil de Freitas
Gerado em: $(date '+%Y-%m-%d %H:%M:%S')
═══════════════════════════════════════════════════════════════

DOMÍNIO:        $DOMINIO
E-MAIL (SSL):   $EMAIL

BANCO DE DADOS:
  Database:     wantuil_db
  Usuário:      wantuil_app
  Senha:        $PG_PASS
  URL:          postgresql://wantuil_app:$PG_PASS@localhost:5432/wantuil_db

USUÁRIO SISTEMA:
  Login:        wantuil
  Senha:        $USER_PASS

ARQUIVO ESTE:   /root/wantuil-config.txt
  (apague depois de salvar em outro lugar!)
═══════════════════════════════════════════════════════════════
EOF
chmod 600 /root/wantuil-config.txt

clear
echo
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║   ✅  Setup da VPS concluído com sucesso!         ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo
echo "📋 Resumo:"
echo "  • Node.js 20 + PM2"
echo "  • PostgreSQL 16 (banco: wantuil_db)"
echo "  • Nginx (proxy reverso)"
echo "  • Firewall ativo (portas 22, 80, 443)"
echo "  • Fail2ban (proteção brute force)"
echo "  • Usuário 'wantuil' criado"
echo "  • Atualizações de segurança automáticas"
echo
warn "📝 Suas credenciais estão em: /root/wantuil-config.txt"
warn "    👉 ANOTE em um lugar seguro e APAGUE o arquivo!"
echo
echo "▶ PRÓXIMO PASSO:"
echo "  1. Aponte seu domínio ($DOMINIO) para o IP desta VPS no painel da Hostinger (DNS)"
echo "  2. Quando o DNS propagar (~30 min), troque para o usuário 'wantuil':"
echo "       su - wantuil"
echo "  3. Continue com o script deploy-app.sh"
echo
