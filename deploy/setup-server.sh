#!/usr/bin/env bash
# One-time server setup for TopupCraft on Ubuntu 22.04 / 24.04.
#
#   1. Point DNS at this server first (Cloudflare, all three "DNS only"):
#        A  @    -> server IP
#        A  www  -> server IP
#        A  *    -> server IP
#   2. Put the code in /opt/topupcraft/app  (git clone ... /opt/topupcraft/app)
#   3. sudo bash /opt/topupcraft/app/deploy/setup-server.sh
#
# Safe to run again: existing database, .env and secrets are kept.
set -euo pipefail

APP=/opt/topupcraft/app
PORT=3000
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }
[ -f "$APP/package.json" ] || { echo "Code not found in $APP. Clone the repository there first."; exit 1; }

ask() { local var=$1 prompt=$2 default=${3:-} secret=${4:-}; local value=${!var:-}
  if [ -z "$value" ]; then
    if [ -n "$secret" ]; then read -rsp "$prompt: " value; echo; else read -rp "$prompt${default:+ [$default]}: " value; fi
  fi
  printf -v "$var" '%s' "${value:-$default}"; }

ask DOMAIN "Your domain" "topupcraft.com"
ask ACME_EMAIL "Email for SSL certificate notices"
ask CF_API_TOKEN "Cloudflare API token (Zone > DNS > Edit for $DOMAIN)" "" secret
[ -n "$ACME_EMAIL" ] && [ -n "$CF_API_TOKEN" ] || { echo "Email and Cloudflare token are required."; exit 1; }

for port in 80 443; do
  if ss -ltnpH "sport = :$port" | grep -v caddy | grep -q .; then
    echo "Port $port is already used by another program (e.g. a VPN or web server):"
    ss -ltnp "sport = :$port" || true
    echo "Free ports 80 and 443 first, then run this script again."; exit 1
  fi
done

SERVER_IP=${SERVER_IP:-$(curl -4 -fsS --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')}
echo "==> Server IP: $SERVER_IP"

echo "==> Swap (needed to build on small servers)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git ufw postgresql debian-keyring debian-archive-keyring apt-transport-https >/dev/null
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi
# grep -q closes the pipe early, which fails under pipefail; match on captured output instead.
has_cf_module() { local mods; mods=$("$1" list-modules 2>/dev/null) || return 1; [[ $mods == *dns.providers.cloudflare* ]]; }
if ! has_cf_module caddy; then
  echo "==> Installing Caddy build with the Cloudflare DNS module"
  ARCH=$(dpkg --print-architecture)
  curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=${ARCH}&p=github.com%2Fcaddy-dns%2Fcloudflare" -o /usr/bin/caddy.custom
  chmod +x /usr/bin/caddy.custom
  has_cf_module /usr/bin/caddy.custom || { echo "Downloaded Caddy build lacks the Cloudflare DNS module."; exit 1; }
  dpkg-divert --divert /usr/bin/caddy.default --rename /usr/bin/caddy 2>/dev/null || true
  mv /usr/bin/caddy.custom /usr/bin/caddy
fi

echo "==> System user and folders"
id topupcraft >/dev/null 2>&1 || useradd --system --home /opt/topupcraft --shell /usr/sbin/nologin topupcraft
mkdir -p /var/lib/topupcraft/storage /var/backups/topupcraft
chown -R topupcraft:topupcraft /opt/topupcraft /var/lib/topupcraft
chmod 750 /var/lib/topupcraft
git config --system --add safe.directory "$APP" || true

echo "==> Database"
systemctl enable --now postgresql >/dev/null
if [ -f "$APP/.env" ]; then
  echo "    Keeping existing $APP/.env"
else
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -qc "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='tc') THEN CREATE ROLE tc LOGIN CREATEDB; END IF; END \$\$;"
  sudo -u postgres psql -qc "ALTER ROLE tc PASSWORD '$DB_PASS'"
  cat > "$APP/.env" <<ENV
PLATFORM_ROOT_DOMAIN="$DOMAIN"
SERVER_IP="$SERVER_IP"
PLATFORM_DATABASE_URL="postgresql://tc:$DB_PASS@127.0.0.1:5432/tc_platform"
TENANT_DATABASE_URL="postgresql://tc:$DB_PASS@127.0.0.1:5432/{db}"
TENANT_TEMPLATE_DB="tc_panel_template"
DATABASE_URL="postgresql://tc:$DB_PASS@127.0.0.1:5432/tc_panel_template"
PLATFORM_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
CRON_SECRET="$(openssl rand -hex 32)"
STORAGE_DIR="/var/lib/topupcraft/storage"
PORT="$PORT"
ENV
  chown topupcraft:topupcraft "$APP/.env"
  chmod 600 "$APP/.env"
fi
for db in tc_platform tc_panel_template; do
  sudo -u postgres psql -Atc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 || sudo -u postgres createdb -O tc "$db"
done

run() { sudo -u topupcraft -H env HOME=/opt/topupcraft "$@"; }
cd "$APP"
echo "==> Installing packages (a few minutes)"
run npm ci --no-audit --no-fund
echo "==> Creating database tables"
run npm run -s saas:migrate
run npm run -s db:seed
echo "==> Building the app (5-15 minutes on a 1 GB server)"
SKIP_TYPECHECK=0
[ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 1900 ] && SKIP_TYPECHECK=1 && echo "    Small server: skipping the build-time type check"
run env NODE_OPTIONS=--max-old-space-size=1536 SKIP_TYPECHECK=$SKIP_TYPECHECK npx next build

echo "==> Service"
cp "$APP/deploy/topupcraft.service" /etc/systemd/system/topupcraft.service
systemctl daemon-reload
systemctl enable --now topupcraft
systemctl restart topupcraft

echo "==> Caddy (HTTPS)"
install -m 600 /dev/null /etc/caddy/cloudflare.env
echo "CF_API_TOKEN=$CF_API_TOKEN" > /etc/caddy/cloudflare.env
mkdir -p /etc/systemd/system/caddy.service.d
printf '[Service]\nEnvironmentFile=/etc/caddy/cloudflare.env\n' > /etc/systemd/system/caddy.service.d/cloudflare.conf
sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__ACME_EMAIL__/$ACME_EMAIL/g" -e "s/__PORT__/$PORT/g" "$APP/deploy/Caddyfile.template" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl daemon-reload
systemctl enable caddy >/dev/null
systemctl restart caddy

echo "==> Scheduled jobs"
CRON_SECRET=$(grep '^CRON_SECRET=' "$APP/.env" | cut -d'"' -f2)
install -m 600 /dev/null /etc/topupcraft-cron.env
echo "CRON_SECRET=$CRON_SECRET" > /etc/topupcraft-cron.env
cat > /usr/local/bin/topupcraft-cron <<CRON
#!/usr/bin/env bash
. /etc/topupcraft-cron.env
curl -fsS -m 290 -X POST -H "x-cron-secret: \$CRON_SECRET" "http://127.0.0.1:$PORT/api/saas/internal/cron\${1:+?job=\$1}" >/dev/null
CRON
chmod 700 /usr/local/bin/topupcraft-cron
cat > /etc/cron.d/topupcraft <<CRON
*/5 * * * * root /usr/local/bin/topupcraft-cron
*/10 * * * * root /usr/local/bin/topupcraft-cron orders
30 3 * * * root bash $APP/deploy/backup.sh >/var/log/topupcraft-backup.log 2>&1
CRON

echo "==> Firewall"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

cat <<DONE

Done. TopupCraft is running.

Next:
  1. Create your super admin login:
       cd $APP && sudo -u topupcraft -H env HOME=/opt/topupcraft npm run saas:create-admin -- you@example.com "Your Name"
  2. Open https://$DOMAIN/login and sign in.
  3. In Super admin > Settings add your UddoktaPay API URL and key.
     Webhook URL for UddoktaPay: https://$DOMAIN/api/saas/payment/webhook

Useful:
  Logs:    journalctl -u topupcraft -f
  Update:  sudo bash $APP/deploy/update.sh
  Backups: /var/backups/topupcraft (daily, 14 days)
DONE
