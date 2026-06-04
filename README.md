# YANN OS — Dashboard

OS personnel pour piloter les agents IA et automatisations Coliver + SEO.

🌐 **Live** : https://dashboard.makeitapp.fr

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (design system custom)
- React Router DOM
- Lucide React (icônes)
- Recharts (graphiques)
- Supabase (auth Prénom+PIN via RPC + données)

## Démarrage local

```bash
npm install
npm run dev
```

→ http://localhost:5173

## Build

```bash
npm run build      # tsc + vite build → dist/
npm run preview    # preview du build local
```

## Déploiement

**Pipeline auto** : tout commit poussé sur `main` déclenche `.github/workflows/deploy.yml`
qui SSH au VPS Hostinger et fait `docker compose up -d --build` (≈ 30-45 s).

```bash
git push origin main                              # déclenche le deploy
gh run watch -R yannd-coder/dashboard-os          # suivre le run
gh workflow run "Deploy to VPS" -R yannd-coder/dashboard-os   # trigger manuel
```

Infra : VPS Hostinger (Caddy reverse proxy + LE auto) → container `dashboard` (nginx
sert `dist/` buildé en multi-stage). Pas de FTP O2switch sur ce projet — le
sous-domaine pointe directement vers le VPS.

## Pages

- `/` — Dashboard (hero + stats + agents + machines + activité)
- `/agents` — ARIA, MAX, LÉON, REX, NOVA (filtres par domaine)
- `/machines` — Automatisations groupées par catégorie
- `/coliver` — Gestion des lieux coliving/coworking
- `/seo` — Backlinks acquis (table sortable)
- `/analytics` — KPI cards + graphiques Recharts
- `/settings` — Profil, clés API, déploiement
- `/login` — Prénom + PIN 4 chiffres
- `/admin` — Gestion users (superadmin uniquement)

## État

- ✅ **V0.1** — Design first + mock data
- ✅ **V0.2** — Auth Prénom+PIN branchée sur Supabase (RPC)
- 🔧 **V0.3** — En cours : tables `dashboard_agents` + `dashboard_machines` branchées
- ⏳ **V0.4** — n8n / webhooks pour exécuter machines + agents
