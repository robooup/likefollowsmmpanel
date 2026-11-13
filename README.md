# TopupCraft

Hosted SMM panel platform. Customers come to **topupcraft.com**, order a panel, pay, and get their own
SMM panel on a free subdomain or their own domain. They manage everything from a customer portal; you
manage the whole platform from a super admin.

## How it fits together

| Part | Where | What it does |
|------|-------|--------------|
| TopupCraft site | `topupcraft.com` | Landing, pricing, sign-up, customer portal (`/portal`), super admin (`/admin`) |
| Customer panels | `name.topupcraft.com` or the customer's own domain | The full SMM panel: services, providers, orders, payments, tickets, API |
| Platform database | `tc_platform` | Customers, plans, panels, domains, invoices |
| Panel databases | `tc_panel_<id>` | One private database per panel, cloned from `tc_panel_template` |

One Next.js process serves everything. The request's domain decides which panel (and therefore which
database) a request belongs to — see `server.js`, `proxy.ts`, `lib/db.ts` and `lib/tenant/`.
The platform code lives in `lib/saas/`, `app/(platform)/saas/` and `app/api/saas/`; the panel itself
is under `app/(panel)/` and `app/api/`.

### Order flow

1. Customer registers, picks a plan, a panel name, a subdomain and an admin login.
2. An invoice is created; they pay through UddoktaPay.
3. When the gateway confirms the payment, the panel database is created, the admin account is added and
   the subdomain goes live — automatically.
4. From the portal they can add their own domain (DNS record → Verify → SSL is issued automatically),
   change the primary domain, change the subdomain, and renew or change plan.
5. A panel that is not renewed goes offline after the grace period and comes back when renewed.

## Deploying to a server (Ubuntu 22.04 / 24.04)

You need: the server, the domain on Cloudflare, and a Cloudflare API token with **Zone → DNS → Edit**
for the domain (used to get the wildcard SSL certificate).

1. In Cloudflare DNS add three records pointing to the server IP, all **DNS only** (grey cloud):
   `A @`, `A www`, `A *`.
2. On the server:

   ```bash
   sudo mkdir -p /opt/topupcraft && sudo git clone <your repo url> /opt/topupcraft/app
   ```

   ```bash
   sudo bash /opt/topupcraft/app/deploy/setup-server.sh
   ```

   The script installs Node.js, PostgreSQL and Caddy, creates the databases and a `.env` with random
   secrets, builds the app, and sets up the service, HTTPS, scheduled jobs, daily backups and firewall.
   Ports 80 and 443 must be free.
3. Create your super admin login:

   ```bash
   cd /opt/topupcraft/app && sudo -u topupcraft -H env HOME=/opt/topupcraft npm run saas:create-admin -- you@example.com "Your Name"
   ```

4. Sign in at `https://topupcraft.com/login`, open **Super admin → Settings** and add your UddoktaPay
   API URL and key. In UddoktaPay set the webhook URL to `https://topupcraft.com/api/saas/payment/webhook`.
5. Review the three default plans under **Super admin → Plans**.

Updating later:

```bash
sudo bash /opt/topupcraft/app/deploy/update.sh
```

Moving to a bigger server: copy `/opt/topupcraft/app/.env`, restore the latest folder from
`/var/backups/topupcraft` (database dumps + `storage.tar.gz`), run the setup script, switch DNS.

## Local development

```bash
npm install
```

Create a PostgreSQL role that can create databases, then two empty databases `tc_platform` and
`tc_panel_template`, copy `.env.example` to `.env` and fill it in (use
`PLATFORM_ROOT_DOMAIN="topupcraft.localhost"`), then:

```bash
npm run saas:migrate && npm run db:seed
```

```bash
SAAS_ADMIN_PASSWORD='choose-a-password' npm run saas:create-admin -- admin@example.com "Admin"
```

```bash
npm run dev
```

Open `http://topupcraft.localhost:3000`. Panels are served on `http://<name>.topupcraft.localhost:3000`.
Without a payment gateway configured, mark invoices as paid from **Super admin → Panels → (panel)**.

## Security model (read before changing things)

Panel admins are customers, so panel code is treated as untrusted with respect to the server:

- **Data**: `db` has no default database. Every query is routed by the request's domain to that panel's
  own database; a call without a panel context fails.
- **Sessions**: a panel login is bound to the panel it was issued for and is rejected on any other panel.
  The TopupCraft login uses a separate cookie that panel subdomains cannot overwrite.
- **Files**: uploads go to a private per-panel folder (`STORAGE_DIR/panels/<id>`), only allow-listed file
  types, served through `/api/files/...` with script execution disabled.
- **Outbound requests**: provider / gateway URLs chosen by panel admins cannot reach private or
  loopback addresses (`lib/security/ssrf-guard.ts`).
- **Internal endpoints** (`/api/saas/internal/*`): only reachable from the server itself; the scheduler
  additionally needs `CRON_SECRET`.
- **Admin APIs**: every write under `/api/admin/*` requires a staff session, enforced centrally in `proxy.ts`.

When adding panel code: never read or write the filesystem directly, never cache panel data in a
module-level variable without `createTenantCache` (`lib/tenant/key.ts`), and never build URLs from
environment variables — use `baseUrlSync()` (`lib/tenant/url.ts`).

## Known limits of this first version

- TopupCraft account emails are not verified and there is no "forgot password" for the TopupCraft login yet
  (the platform has no mail server configured). Panel logins have their own reset flow.
- Custom domains are verified by checking that the domain points to this server. A DNS TXT ownership
  check would be stronger and can be added.
- Panels on free subdomains share the parent domain `topupcraft.com`; registering it on the Public Suffix
  List (or using a separate domain for panel subdomains) is recommended as the platform grows.
- Google sign-in inside panels is disabled (one Google OAuth app cannot safely serve many panels).
- Pricing is a fixed monthly price per plan; order-count tiers are not implemented.
