# 🧠 YANN OS Dashboard — CLAUDE.md

> Fichier local à lire **après** le CLAUDE.md global, **avant** le CLAUDE_CONTEXT.md.
> Contient l'état réel du projet et la roadmap.
> Dernière maj : 2026-06-12.

---

## 📊 État du projet

**V0.4 livrée + V0.5 (M02) construite, en attente credentials** — M01 opérationnelle en prod, M02 e2e validée via webhook.

| Ce qui marche | URL / accès |
|---|---|
| 🌐 Site live | https://dashboard.makeitapp.fr |
| 🔐 Login Prénom+PIN | Yann · PIN initial `1234` (V0.2) |
| 🛡️ Admin users → `/admin` | superadmin only (V0.2) |
| 🤖 `/agents` lit `dashboard_agents` (5 agents avec canaux) | V0.3 |
| ⚙️ `/machines` lit `dashboard_machines` (4 machines groupées) | V0.3 |
| 📊 Dashboard hero lit count dynamique agents/machines | V0.3 |
| 🤖 M01 Posts FB/IG : cron lun+jeu 9h Réunion + bouton dashboard → drafts à approuver `/machines/M01` | V0.4 |
| 📬 M02 Réponse prospects : webhook OK, page `/machines/M02` — IMAP + Lodgify à brancher (voir `n8n/M02_setup.md`) | V0.5 |
| 🚀 Pipeline auto | `git push origin main` → live en 30-45s (**refonctionne** depuis le 2026-06-11) |

⚠️ **Encore en mock** : `/coliver`, `/seo`, `/analytics`, ActivityFeed, dashboardStats — à brancher quand le besoin se présentera.

---

## 🏗️ Architecture réelle

```
                        VPS Hostinger 2.24.8.83
                        ┌─────────────────────────────────┐
   user ─► dns ─► caddy │ caddy:2.8 (LE auto, HSTS, gzip) │
                        │  └► reverse_proxy → dashboard   │
                        │                                  │
                        │ dashboard (multi-stage)         │
                        │  Stage 1 : node:20 npm build    │
                        │  Stage 2 : nginx:1.27 sert dist │
                        └────────────┬─────────────────────┘
                                     │
                                     ▼
        Supabase kor-app (Europe West, eu-west-1)
        flqjaqocsugwbkbiuhhk.supabase.co
```

- **VPS Hostinger** `2.24.8.83` (user `root`, clé `~/.ssh/hostinger_vps`)
- **Repo VPS** : auto-découvert par le workflow via `docker inspect dashboard`
- **Containers** : `dashboard` + `dashboard-caddy` (docker compose)
- **Supabase** : kor-app (Europe West) — projet 2/2 du free tier, l'autre est Sydney
- **DocumentRoot O2switch (`*.makeitapp.fr`)** : **N'EST PAS UTILISÉ** pour ce projet — c'est le VPS qui sert tout via Caddy

---

## 🚀 Comment déployer

**Tout commit poussé sur `main`** déclenche `.github/workflows/deploy.yml` :
1. SSH au VPS via secrets `VPS_*`
2. `git pull origin main` dans `/root/dashboard-os` (ou auto-discovery)
3. Écrit `.env` depuis les secrets `VITE_*`
4. `docker compose up -d --build` (rebuild image avec VITE_* bakés)
5. `docker image prune -f`

**Suivre un deploy** : `gh run watch -R yannd-coder/dashboard-os`

**Trigger manuel** : `gh workflow run "Deploy to VPS" -R yannd-coder/dashboard-os`

---

## 🗄️ Supabase — tables + RPC

**Projet** : `kor-app` (`flqjaqocsugwbkbiuhhk`) — Europe West

### Auth (V0.2)
**Table** : `public.dashboard_users` (RLS on, aucune policy directe anon — tout passe par RPC)

**7 RPC `SECURITY DEFINER`** (toutes grantées à `anon`) :
- `dashboard_login(prenom, pin)` → user si match
- `dashboard_get_user(user_id)` → user pour re-vérif au mount
- `dashboard_change_pin(user_id, old, new)`
- `dashboard_list_users()` → AdminPanel
- `dashboard_create_user(prenom, pin, role, is_approved)`
- `dashboard_update_user(user_id, is_approved, role)`
- `dashboard_delete_user(user_id)`

**Hashage** : bcrypt via `pgcrypto.crypt()` / `gen_salt('bf')`.

**Reset PIN Yann (si oublié)** :
```sql
UPDATE dashboard_users
SET pin_hash = extensions.crypt('1234', extensions.gen_salt('bf')),
    must_change_pin = true
WHERE prenom = 'Yann';
```

### Data (V0.3)
**Tables** : `public.dashboard_agents` + `public.dashboard_machines`
- RLS on, **anon SELECT only** (lecture pure depuis le front avec anon key)
- Mutations actuellement via SQL direct ou Supabase Studio
- Migration versionnée : `supabase/migrations/20260604_dashboard_agents_machines.sql`
- Icônes stockées en string (`'Sparkles'`, `'Mail'`...) → résolues côté front via `lib/icons.ts`

**Seeded** : 5 agents (ARIA, MAX, LÉON, REX, NOVA) + 4 machines (M01 Générateur Posts FB, M02 Réponse prospects, M03 Relance clients, M04 NDD Scanner SEO).

**14+ warnings advisors** Supabase = tous intentionnels (RLS sans policy write + RPC anon executable + tables seed-only = pattern Yann documenté).

---

## 🛣️ Roadmap

- ✅ **V0.1** — design first, 7 pages avec mock data (commit `647cc13`)
- ✅ **V0.2** — auth Prénom+PIN via Supabase RPC (commit `5bf2fdc` + infra `5094dcc` + `b52468a`)
- ✅ **V0.3** — agents + machines lus depuis Supabase (commit `1e9fdfe`)
- ✅ **V0.4** — M01 Posts Coworking dans n8n (workflow `3lG5bUiIwcD22dVl`, publié) : webhook + cron lun/jeu 5h UTC → Claude FB + IG → drafts pending → approve/reject dashboard. E2E validé le 2026-06-11. Fix CORS preflight Caddy + refetch échelonnés.
- 🔧 **V0.5 — EN COURS** : M02 Réponse prospects (workflow `LrozR6S6eT729sil`, créé **par API n8n**, actif)
  - Fait : tables `dashboard_prospects` + `dashboard_response_drafts` + 3 RPC, page `/machines/M02`, pipeline classify→reply Claude, e2e webhook validé, dédup `message_id`
  - ⏳ Bloqué sur Yann : boîte `contact@coliver.re` (credential IMAP) + clé API Lodgify (dispos/tarifs réels) — procédure dans `n8n/M02_setup.md`
  - M03 relances + M04 NDD scanner : **en pause** (décision Yann 2026-06-12)
  - Bug mineur M01 : node Set Context hardcode `trigger_source=cron` → fix à faire dans l'UI ou par API (M02 a déjà le fix)
- ⏳ **V0.6** — coliver + SEO branchés sur Supabase + activity feed live

---

## 🔒 Dettes de sécurité

### 1. ✅ `N8N_WEBHOOK_SECRET` rotaté (Yann, 2026-06-12)
Réglé. Le nouveau secret est dans les secrets GH Actions + `/root/dashboard-os/.env` (VPS) + `.env` local.
Si besoin de le relire : `ssh -i ~/.ssh/hostinger_vps root@2.24.8.83 "grep '^N8N_WEBHOOK_SECRET=' /root/dashboard-os/.env"` — ne jamais le coller en clair dans une conversation.

### 2. ✅ (à surveiller) Whitelist UFW des IPs GitHub Actions
Semble résolue : 2 deploys auto consécutifs réussis les 2026-06-11 et 2026-06-12. Si un deploy retombe en timeout SSH, relancer sur le VPS :
```bash
curl -s https://api.github.com/meta | jq -r '.actions[]' | while read cidr; do
  ufw allow from "$cidr" to any port 22 proto tcp comment 'GH Actions'
done
ufw reload
```
**Alternative plus propre (à terme)** : Tailscale (runner GH rejoint le tailnet → SSH via 100.x.y.z, plus de whitelist). Effort ~30 min.

**Workaround si bloqué** : deploy manuel depuis le mac :
```bash
ssh -i ~/.ssh/hostinger_vps root@2.24.8.83 \
  "cd /root/dashboard-os && git pull origin main && docker compose up -d --build"
```

### 3. Clé API n8n
Stockée dans `.env` local (`N8N_API_KEY`, gitignoré). Permet de gérer les workflows par API REST (`https://n8n.makeitapp.fr/api/v1/...`). JWT sans expiration courte → à régénérer dans n8n Settings → API si compromise.

---

## ⚠️ Pièges connus (à pas répéter)

1. **Ne JAMAIS uploader en FTP O2switch pour ce projet** — le sous-domaine pointe vers le VPS, pas vers `/home/deya7315/dashboard.makeitapp.fr/`. Le dossier orphelin a été nettoyé.
2. **Le `.deploy` local et le `README.md` mentionnent encore FTP** — à nettoyer (pas fait pour ne pas polluer la session). Le `.deploy` est dans `.gitignore` donc inoffensif.
3. **`PermitRootLogin no` sur le VPS** bloque l'auth GH Actions. Doit rester `prohibit-password` minimum (Yann a fait le changement le 2026-06-01).
4. **fail2ban** : 5+ tentatives SSH ratées depuis une IP → ban temporaire (15 min par défaut). Si tu n'arrives plus à SSH, c'est probablement ça.
5. **`.env` est dans `.dockerignore`** — les `VITE_*` doivent passer par **build args** dans Dockerfile, sinon Vite plante au build (les vars sont bakées au build, pas au runtime).

---

## 🔑 Secrets GitHub Actions (configurés)

7 secrets dans https://github.com/yannd-coder/dashboard-os/settings/secrets/actions :
- `VPS_HOST` = `2.24.8.83`
- `VPS_USER` = `root`
- `VPS_APP_DIR` = `/root/dashboard-os` (fallback auto-discovery dans le workflow)
- `VPS_SSH_KEY` = contenu de `~/.ssh/hostinger_vps`
- `VITE_APP_NAME` = `YANN OS`
- `VITE_SUPABASE_URL` = `https://flqjaqocsugwbkbiuhhk.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_ZEztH4rLAFrFBBYGEhRy9w_FOiCic-m`

---

## 🎯 Comment continuer la prochaine session

**Focus V0.4** : construire la machine **M01 Générateur Posts Facebook Coworking** dans n8n, puis la brancher au dashboard.

Questions à clarifier avec Yann avant de coder :
1. **n8n** est-il déjà self-hosted (sur le VPS Hostinger ?) ou à installer ? Cloud ($20/mois) écarté par défaut.
2. **Trigger** : bouton "Lancer" depuis dashboard (webhook n8n entrant) ou cron auto (ex: lundi 9h) ?
3. **Workflow LLM** : Claude (Anthropic) ou Gemini ? Yann a déjà des clés via `MYINVOICE_ANTHROPIC_API_KEY` et `COLIVER_STAFF_GEMINI_API_KEY` (à dupliquer avec préfixe `DASHBOARD_`).
4. **Image** : générée (Imagen / Replicate / DALL-E) ou banque d'images existante du coworking ?
5. **Publication** : direct sur la page FB Coworking ou queue de drafts à approuver ?
6. **Cible** : combien de coworkings ? (probablement Yann a une page FB pour son lieu — laquelle ?)

**Plan suggéré une fois validé** :
1. Créer table `dashboard_machine_runs` (id, machine_code, status, input_jsonb, output_jsonb, started_at, ended_at, error)
2. Installer n8n sur le VPS (docker compose à côté du dashboard) si pas déjà fait
3. Construire le workflow n8n : webhook → Claude (prompt avec contexte coworking) → optionnel image → FB Graph API
4. Côté front : bouton "Lancer" sur MachineCard M01 → POST webhook n8n + insert ligne dans `dashboard_machine_runs`
5. Page detail `/machines/m01` avec historique runs

**Tâches de fond** à proposer si Yann a 30 min :
- Code-split du bundle (855 KB → trop gros) : `manualChunks` pour séparer Supabase + Recharts
- Brancher l'ActivityFeed sur les runs de machines en temps réel (Supabase Realtime)
- Tests E2E du flow login (Playwright ?)

---

## 📂 Fichiers clés du projet

```
dashboard/
├── CLAUDE.md                    ← ce fichier
├── CLAUDE_CONTEXT.md            ← contexte permanent Yann
├── .env                         ← secrets locaux (gitignored)
├── .env.example                 ← template public
├── Dockerfile                   ← multi-stage avec VITE_* ARGS
├── docker-compose.yml           ← dashboard + caddy, lit .env pour args
├── Caddyfile                    ← reverse proxy + LE auto
├── nginx.docker.conf            ← SPA routing + cache
├── .github/workflows/deploy.yml ← auto-deploy sur push main
└── src/
    ├── lib/supabase.ts          ← client Supabase
    ├── lib/api.ts               ← 7 wrappers RPC
    ├── types/auth.ts            ← AppUser, Role
    ├── contexts/AuthContext.tsx ← provider + login/logout/changePin
    ├── hooks/useAuth.ts
    ├── components/auth/         ← ProtectedRoute + PinPad
    └── pages/
        ├── Login.tsx            ← input prénom + PinPad auto-submit
        ├── ChangePin.tsx        ← stepper 3 étapes
        └── Admin.tsx            ← table users + modal créer
```
