# 🧠 YANN OS Dashboard — CLAUDE.md

> Fichier local à lire **après** le CLAUDE.md global, **avant** le CLAUDE_CONTEXT.md.
> Contient l'état réel du projet et la roadmap.
> Dernière maj : 2026-06-02.

---

## 📊 État du projet

**V0.2 déployée en prod** ✅ — auth Prénom+PIN branchée sur Supabase.

| Ce qui marche | URL / accès |
|---|---|
| 🌐 Site live | https://dashboard.makeitapp.fr |
| 🔐 Login → `/login` (auto-redir si pas connecté) | Prénom: `Yann` · PIN initial: `1234` |
| 🛡️ Admin (gestion users) → `/admin` | visible uniquement si role=superadmin |
| 🚀 Pipeline auto | `git push origin main` → live en 30-45s |

⚠️ **À tester par Yann en prod** : le login complet (saisie → change-pin → dashboard → admin → logout). Pas encore validé visuellement.

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

## 🗄️ Supabase — table + RPC

**Projet** : `kor-app` (`flqjaqocsugwbkbiuhhk`) — Europe West

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

**14 warnings advisors** Supabase = tous intentionnels (RLS no-policy + RPC anon executable = pattern Yann documenté).

---

## 🛣️ Roadmap

- ✅ **V0.1** — design first, 7 pages avec mock data (commit `647cc13`)
- ✅ **V0.2** — auth Prénom+PIN via Supabase RPC (commit `5bf2fdc` + infra `5094dcc` + `b52468a`)
- ⏳ **V0.3** — **PROCHAINE ÉTAPE** : remplacer mock data par vrais agents + machines
  - Tables : `dashboard_agents`, `dashboard_machines`, `dashboard_coliver`, `dashboard_seo_backlinks`, `dashboard_activity`
  - Branchement n8n / webhooks pour exécuter machines/agents
  - Update pages `/agents`, `/machines`, `/coliver`, `/seo`, `/analytics`, `/dashboard` pour lire depuis Supabase
- ⏳ **V0.4** — TBD (notifications, paramétrage par user, etc.)

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

**Première question à se poser** : "Le login en prod marche ?" → si pas encore testé, demander à Yann d'ouvrir https://dashboard.makeitapp.fr et de valider.

**Si OK** : attaquer **V0.3**. Plan suggéré :
1. Créer migration Supabase : `dashboard_agents`, `dashboard_machines`, `dashboard_coliver`, `dashboard_seo_backlinks`, `dashboard_activity` (toutes préfixées `dashboard_`)
2. Décider de l'API : RPC ou table directe ? (Pour des reads simples, table + RLS anon read; pour des writes / triggers, RPC SECURITY DEFINER)
3. Côté front : remplacer les `data/agents.ts`, `data/machines.ts`, etc. par des hooks TanStack Query qui appellent Supabase
4. Décider de la fréquence de polling / si on veut realtime (Supabase Realtime channels)
5. Brancher n8n webhooks pour trigger les machines

**Si bug** : reset PIN Yann via le SQL ci-dessus, puis redéployer si besoin (commit + push).

**Tâches de fond** à proposer si Yann est dispo :
- Nettoyer `.deploy` local + `README.md` (qui mentionnent encore FTP O2switch obsolète)
- Code-split du bundle (857 KB → trop gros) : `manualChunks` pour séparer Supabase + Recharts
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
