# Migração para VPS Hostinger — Passo a passo

Este guia te leva de **zero** (sem nunca ter mexido em Linux) até o sistema **rodando na sua VPS** com domínio próprio e HTTPS.

**Tempo estimado:** ~2 horas (a maior parte é esperar coisas instalarem)

---

## O que vai acontecer (visão geral)

1. **Contratar a VPS** na Hostinger
2. **Apontar seu domínio** pra VPS (DNS)
3. **Conectar na VPS** via SSH (terminal remoto)
4. **Rodar o script de setup** (instala Node, PostgreSQL, Nginx, etc — automatizado)
5. **Rodar o script de deploy** (clona seu projeto, builda, sobe)
6. **Pronto.** Acessa `https://seudominio.com.br` e tá rodando.

---

## PARTE 1 — Contratar a VPS na Hostinger

### Plano recomendado

**KVM 1** (o menor) é suficiente:
- 1 vCPU AMD EPYC
- 4 GB RAM
- 50 GB NVMe
- 4 TB de tráfego
- ~R$ 25-30/mês com promoção

### Configuração no checkout

1. **Sistema operacional:** `Ubuntu 24.04 LTS` (importante! Os scripts são pra essa versão)
2. **Localização do servidor:** `São Paulo, Brasil` (latência mais baixa)
3. **Nome do servidor:** `wantuil-almoxarifado` (ou outro, dá pra mudar depois)
4. **Senha root:** **escolha uma senha forte e anote!** Você vai usar daqui a pouco

> ⚠️ **Anote em um lugar seguro:**
> - Senha root da VPS
> - IP da VPS (vai aparecer no painel depois)

---

## PARTE 2 — Apontar o domínio para a VPS

A Hostinger te mostra o **IP da sua VPS** assim que o servidor sobe (~5 minutos). Anote esse IP.

### Se você comprou o domínio na Hostinger

1. Painel da Hostinger → **Domínios** → seu domínio → **Gerenciar DNS**
2. Crie/edite os registros:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | `@` | `IP-DA-SUA-VPS` | 14400 |
| A | `www` | `IP-DA-SUA-VPS` | 14400 |

3. Salvar.

### Se o domínio é em outra empresa (Registro.br, GoDaddy, etc.)

Mesma coisa, mas no painel DNS deles. Crie 2 registros A apontando pra IP da VPS.

> ⏰ **DNS pode demorar de 5 min até 30 min** pra propagar. Vai pra próxima etapa enquanto isso.

**Como verificar se propagou:**
- Abra https://dnschecker.org
- Cola seu domínio, escolhe "A"
- Quando você ver o IP da VPS na maioria das localidades → propagou ✓

---

## PARTE 3 — Conectar na VPS pela primeira vez

Você precisa de um programa pra fazer **SSH** (terminal remoto seguro). Como você está no Windows (provavelmente):

### Opção A — Windows Terminal (recomendado, já vem instalado no Win 11)

1. Aperta **tecla Windows** → digita "Terminal" → abre
2. No terminal, digita:
   ```
   ssh root@SEU-IP-AQUI
   ```
3. Vai pedir se aceita a fingerprint → digite `yes` e Enter
4. Vai pedir senha → digite a senha root que você definiu (a senha **não aparece** na tela enquanto digita — é normal)
5. Logou ✓

### Opção B — PuTTY (Windows mais antigo ou se quiser interface gráfica)

1. Baixa em https://putty.org → instala
2. Abre o PuTTY
3. Em "Host Name": coloca o IP da VPS
4. Porta: `22`
5. Clica "Open"
6. Aceita fingerprint
7. Login: `root`
8. Senha: a sua

### Opção C — Mac/Linux

Abre o **Terminal** nativo, digita:
```
ssh root@SEU-IP-AQUI
```
Mesmo fluxo.

### Como vai parecer quando funcionar

```
Welcome to Ubuntu 24.04.1 LTS (GNU/Linux ...)

  System information as of ...
  System load:  0.05
  Usage of /:   5.2% of 49.45GB
  Memory usage: 12%
  ...

Last login: ...
root@wantuil-almoxarifado:~#
```

Esse `root@...:~#` é o **prompt** do terminal. É aí que você digita comandos.

---

## PARTE 4 — Rodar o script de setup

Você precisa subir o `setup-vps.sh` pra VPS. **Maneira mais fácil:** copiar via terminal.

### Passo 4.1 — Subir o script setup-vps.sh

No terminal **da sua VPS** (logado como root), cole esse comando todo de uma vez (Ctrl+C / Ctrl+V):

```bash
nano /root/setup-vps.sh
```

Vai abrir um editor de texto **dentro do terminal**. Agora:

1. **Abra o arquivo `scripts/setup-vps.sh` no seu computador**, no editor que você quiser
2. **Selecione TODO o conteúdo** (Ctrl+A) e copia (Ctrl+C)
3. **No terminal SSH**, com o nano aberto, cola (Ctrl+Shift+V no Windows Terminal, ou botão direito do mouse)
4. Aperta **Ctrl+O** → Enter (salva)
5. Aperta **Ctrl+X** (sai do nano)

### Passo 4.2 — Executar o script

Ainda no terminal:

```bash
bash /root/setup-vps.sh
```

O script vai:
- Te perguntar seu domínio, e-mail, senhas → **anote tudo num lugar seguro**
- Instalar Node.js 20, PostgreSQL 16, Nginx, PM2, firewall, fail2ban
- Criar banco de dados, usuário do sistema, swap
- Demora ~10 minutos. Você pode tomar um café.

Quando terminar, vai mostrar:
```
✅ Setup da VPS concluído com sucesso!
```

> ⚠️ **IMPORTANTE:** o script salva suas senhas em `/root/wantuil-config.txt`. **Anote em outro lugar e apague o arquivo** depois:
> ```bash
> cat /root/wantuil-config.txt   # exibe pra você copiar
> shred -u /root/wantuil-config.txt   # apaga com segurança
> ```

---

## PARTE 5 — Trocar para o usuário 'wantuil'

Por segurança, daqui pra frente **não vamos mais usar root**. Vamos usar o usuário `wantuil` que o script criou.

No terminal:

```bash
su - wantuil
```

Vai pedir a senha do usuário `wantuil` (que você definiu no setup).

Agora o prompt mudou pra:
```
wantuil@wantuil-almoxarifado:~$
```

---

## PARTE 6 — Rodar o script de deploy

### Passo 6.1 — Subir o `deploy-app.sh`

Mesma técnica do anterior — copiar via nano:

```bash
nano ~/deploy-app.sh
```

Cola o conteúdo de `scripts/deploy-app.sh` (do seu computador). Salva com Ctrl+O, Enter, Ctrl+X.

### Passo 6.2 — Executar

```bash
bash ~/deploy-app.sh
```

Vai pedir:
- **Domínio** (mesmo que no setup)
- **URL do repositório Git** (ex: `https://github.com/LeonardoXavierNeves/Wantuil-de-Freitas`)
- **Senha do banco** (a mesma do setup)
- **Resend API Key** (se você usa notificação por e-mail; pode deixar vazio)
- **E-mail destino** das notificações

Depois ele:
1. Clona seu projeto do GitHub
2. Instala dependências do backend
3. Aplica o schema do banco (cria tabelas)
4. Builda o backend
5. Instala e builda o frontend
6. Sobe o backend com PM2
7. Configura o Nginx
8. **Configura HTTPS** com Let's Encrypt (só se você confirmar que o DNS já propagou)
9. Cria seu admin no banco
10. Configura backup diário automático

Demora ~5-10 minutos.

### Passo 6.3 — Configurar o PM2 startup (1 comando especial)

Durante o deploy, vai aparecer uma mensagem:
```
✋ EXECUTE ESTE COMANDO COMO ROOT (em outra janela ou com sudo):
   sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u wantuil --hp /home/wantuil
```

**Em outra janela do terminal**, conecta como root e cola esse comando. (Esse comando é o que faz o backend voltar a rodar automaticamente se a VPS reiniciar.)

Depois volta no terminal anterior e aperta Enter pra continuar.

---

## PARTE 7 — Acessar o sistema

Depois do "✅ Deploy concluído", abra o navegador:

🌐 **`https://seudominio.com.br`**

Login inicial:
- E-mail: `admin@wantuil.org.br`
- Senha: `admin123`

> ⚠️ **TROQUE A SENHA NO PRIMEIRO LOGIN** (Configurações → Usuários → seu usuário → Editar).

---

## PARTE 8 — Atualizando o sistema depois (versões futuras)

Quando você fizer um push novo no GitHub, pra atualizar a VPS:

1. Sobe o `update-app.sh` pra `/home/wantuil/update-app.sh` (mesma técnica do nano)
2. Roda:
   ```bash
   bash ~/update-app.sh
   ```

Ele faz: backup do banco → pull do git → rebuild → reinicia. Em ~2 minutos tá no ar.

---

## Comandos úteis no dia-a-dia

### Ver se o backend está rodando
```bash
pm2 status
```

### Ver logs em tempo real (Ctrl+C pra sair)
```bash
pm2 logs wantuil-api
```

### Reiniciar o backend (se travar)
```bash
pm2 restart wantuil-api
```

### Ver erros do Nginx
```bash
sudo tail -f /var/log/nginx/wantuil-error.log
```

### Listar backups do banco
```bash
ls -lh /var/backups/wantuil/
```

### Restaurar um backup (em caso de desastre)
```bash
# Substitua YYYYMMDD pelo backup desejado
gunzip < /var/backups/wantuil/wantuil_YYYYMMDD_HHMMSS.sql.gz | \
  PGPASSWORD='sua_senha_aqui' psql -h localhost -U wantuil_app wantuil_db
```

### Espaço em disco
```bash
df -h
```

### Memória
```bash
free -h
```

---

## Migração dos dados do Supabase para a VPS

Se você quer levar os dados que já estão no Supabase pra VPS nova:

### 1. No Supabase (origem)
1. Painel → Database → Settings
2. Pega a Connection String (formato `postgresql://...`)
3. No seu computador (precisa do `pg_dump` instalado):
   ```bash
   pg_dump 'sua-connection-string-supabase' > backup-supabase.sql
   ```

### 2. Sobe o arquivo pra VPS
Do seu computador, manda o `backup-supabase.sql` pra VPS:
```bash
scp backup-supabase.sql wantuil@SEU-IP:/tmp/
```

### 3. Restaura na VPS
Conectado na VPS como `wantuil`:
```bash
PGPASSWORD='sua_senha_pg' psql -h localhost -U wantuil_app wantuil_db < /tmp/backup-supabase.sql
```

---

## Troubleshooting

### "Erro 502 Bad Gateway" ao abrir o site
O backend caiu. Reinicia:
```bash
pm2 restart wantuil-api
pm2 logs wantuil-api --lines 50   # ver o que aconteceu
```

### Site não abre nem com http
- Verifica se DNS propagou (https://dnschecker.org)
- Verifica firewall: `sudo ufw status` (precisa ter 80 e 443 abertos)
- Verifica Nginx: `sudo systemctl status nginx`

### "Não consigo conectar via SSH"
- IP correto?
- Senha correta? (não aparece na tela)
- Firewall do seu computador / antivírus bloqueando porta 22?
- Hostinger: painel → VPS → tem opção "Browser Terminal" se SSH falhar

### Certbot (HTTPS) falhou
Geralmente é porque DNS ainda não propagou. Aguarda 30 min e:
```bash
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

### Esqueci a senha do banco
Como root, redefine:
```bash
sudo -u postgres psql -c "ALTER USER wantuil_app WITH PASSWORD 'nova-senha';"
```
Aí edita o `.env` do backend pra usar a nova senha e reinicia (`pm2 restart wantuil-api`).

### Quero ver tudo que tá rodando
```bash
pm2 status              # backend
sudo systemctl status nginx       # web server
sudo systemctl status postgresql  # banco
sudo systemctl status fail2ban    # proteção
```

---

## Custo mensal estimado

| Item | Valor |
|------|-------|
| VPS KVM 1 Hostinger | ~R$ 27,00/mês (promoção) |
| Domínio (.com.br) | ~R$ 40,00/ano |
| Certificado SSL | Grátis (Let's Encrypt) |
| Backup | Grátis (script local na VPS) |
| **TOTAL** | **~R$ 30,00/mês** |

Comparado a Render Pro ($7) + Vercel Pro ($20) + Supabase Pro ($25) = ~$52/mês = **R$ 270+/mês**, a VPS sai **9x mais barato** e você tem controle total.

---

## Próximos passos opcionais (depois que tudo estiver rodando)

1. **Backup off-site:** copiar os backups pra outro lugar (Google Drive, S3, etc) — pra caso a VPS toda morra
2. **Monitoramento:** instalar Uptime Kuma ou usar UptimeRobot externo
3. **Cloudflare:** pôr o domínio atrás do Cloudflare (grátis, dá DDoS protection)
4. **Subdomínio admin:** se quiser separar (ex: `app.wantuil.org.br`)

Me chama quando chegar nesses passos — te ajudo a configurar.
