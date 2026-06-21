# 🔐 Secrets — gestion centralisée

Tout est dans **un seul fichier** : `secrets/secrets.txt`. Tu édites, tu sync, c'est tout.

## Setup initial (à faire 1 fois)

```bash
cp secrets/secrets.txt.example secrets/secrets.txt
# Édite secrets/secrets.txt avec tes vraies valeurs
bash scripts/sync-secrets.sh
```

## Rotation d'un secret (le cas d'usage principal)

Exemple : tu veux régénérer ta clé Anthropic.

1. Va sur https://console.anthropic.com/settings/keys → crée une nouvelle clé → copie la valeur
2. Édite `secrets/secrets.txt`, remplace la ligne `DASHBOARD_AGENTS_ANTHROPIC_KEY=...`
3. Lance :
   ```bash
   bash scripts/sync-secrets.sh
   ```
4. Done. La nouvelle clé est propagée à Supabase, GH Actions, VPS, et ton `.env` local.
5. Révoque l'ancienne clé sur la console Anthropic.

## Ajouter un nouveau secret

1. Ajoute la ligne dans `secrets/secrets.txt` ET dans `secrets/secrets.txt.example` (avec une valeur placeholder type `xxxxxxxx`)
2. Édite `scripts/sync-secrets.sh` pour pousser le nouveau secret vers le bon endroit (Supabase / GH / VPS / local)
3. Run le script.

## Inspection (avant de pousser)

```bash
bash scripts/sync-secrets.sh --dry-run
```

→ Affiche ce qui serait fait, sans rien changer.

## Pourquoi cette structure ?

- **Un seul fichier source de vérité** — plus de "où est ce secret déjà ?"
- **Édition humaine simple** — c'est juste un `.env`, ouvre-le dans n'importe quel éditeur
- **Propagation automatique** vers les 4 endroits où les secrets vivent (local, Supabase, GH, VPS)
- **`secrets/secrets.txt` est gitignored** — jamais commité par accident
- **Pas de copier-coller** des secrets dans le terminal ou un chat → moins de fuites

## Ce que le script propage (résumé)

| Endroit | Quels secrets | Pourquoi |
|---|---|---|
| `.env` local | Tout sauf les "*_ANTHROPIC_*" et "N8N_WEBHOOK_*" | Vite build + scripts Python |
| Supabase Edge Functions | `DASHBOARD_AGENTS_ANTHROPIC_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` | Utilisés par chat-agent + ingest-knowledge |
| GitHub Actions secrets | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `N8N_WEBHOOK_SECRET` | Utilisés par le workflow deploy.yml |
| VPS `/root/dashboard-os/.env` | `VITE_*`, `N8N_WEBHOOK_*` | Utilisés par les containers Docker (rebuild auto à chaque deploy) |
