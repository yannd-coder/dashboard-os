# YANN OS — Dashboard

OS personnel pour piloter les agents IA et automatisations Coliver + SEO.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (design system custom inspiré AFFISEO)
- React Router DOM
- Lucide React (icônes)
- Recharts (graphiques)

## Démarrage

```bash
npm install
npm run dev
```

→ http://localhost:5173

## Build

```bash
npm run build      # tsc + vite build → dist/
npm run preview    # preview du build
```

## Déploiement

→ `dashboard.makeitapp.fr` via FTP O2switch (`/deploy`).

1. Copier `.deploy.example` en `.deploy` et remplir le `FTP_PASS`
2. Lancer `/deploy` depuis Claude Code

## Pages

- `/` — Dashboard (hero + stats + agents + machines + activité)
- `/agents` — Léon, Aria, Max, Rex, Nova (filtres par domaine)
- `/machines` — Automatisations groupées par catégorie
- `/coliver` — Gestion des lieux coliving/coworking La Réunion
- `/seo` — Backlinks acquis avec table sortable
- `/analytics` — KPI cards + graphiques Recharts
- `/settings` — Profil, clés API, déploiement

## État

- ✅ V0.1 — Design first avec mock data en dur (sans auth)
- ⏳ V0.2 — Branchement Supabase + auth Prénom + PIN
- ⏳ V0.3 — Branchement n8n / webhooks pour les vraies machines
