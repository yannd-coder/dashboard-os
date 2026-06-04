# M01 — Générateur Posts Facebook + Instagram Coworking

Workflow n8n pour ARIA. Génère 2 drafts (FB + IG) à chaque run et les insère
dans `dashboard_posts_drafts` (status `pending`). Approbation manuelle depuis
le dashboard.

---

## Vue d'ensemble

```
[Webhook trigger]  ─┐
                    ├─► [Merge] ─► [Set Context] ─► [Create Run] ─► [Claude FB]
[Schedule trigger] ─┘                                                    │
                                                                         ▼
                                                                    [Insert FB Draft]
                                                                         │
                                                                         ▼
                                                                    [Claude IG]
                                                                         │
                                                                         ▼
                                                                    [Insert IG Draft]
                                                                         │
                                                                         ▼
                                                                    [Complete Run]
```

En cas d'erreur, ajouter un "Error Trigger" sur le workflow qui appelle
`Complete Run` avec `status=error` et l'erreur.

---

## 1. Webhook Trigger

- **Type** : `Webhook`
- **HTTP Method** : `POST`
- **Path** : `m01-trigger`
- **Authentication** : None (auth gérée par Caddy via `X-Webhook-Secret`)
- **Response Mode** : `Last Node` (renvoie `run_id` au front)

URL prod : `https://n8n.makeitapp.fr/webhook/m01-trigger`
URL test : `https://n8n.makeitapp.fr/webhook-test/m01-trigger`

Body reçu :
```json
{ "triggered_by": "<uuid optional>", "trigger_source": "manual" }
```

---

## 2. Schedule Trigger (cron)

- **Type** : `Schedule Trigger`
- **Rule** : Cron expression `0 5 * * 1,4`
  - Lundi + Jeudi à 5h UTC = **9h heure Réunion (UTC+4)**

Output pour merge : `{ "trigger_source": "cron" }` (via node Set juste après si besoin).

---

## 3. Merge (combine les 2 triggers)

- **Type** : `Merge`
- **Mode** : `Append`
- 2 inputs : webhook + schedule

---

## 4. Set Context (variables du coworking)

- **Type** : `Set`
- **Mode** : `Keep Only Set`

Champs à ajouter (en mode "expression" pour ceux qui dépendent du body) :

| Nom | Valeur |
|---|---|
| `machine_code` | `M01` |
| `trigger_source` | `={{ $json.trigger_source ?? 'cron' }}` |
| `triggered_by` | `={{ $json.triggered_by ?? null }}` |
| `coworking_name` | `Coliver Tropical — Espace Coworking` |
| `location` | `Saint-Pierre, La Réunion (île tropicale, océan Indien)` |
| `vibe` | `coworking tropical face à la nature, communauté de freelances et entrepreneurs, ambiance décontractée et inspirante, wifi fibre, espaces intérieurs et extérieurs` |
| `cta_text` | `Réserve ton bureau` |
| `cta_url` | `https://coliver-coworking-book.makeitapp.fr` |
| `fb_handle` | `Coliver Tropical` |
| `ig_handle` | `@colivercoworking` |
| `hashtags` | `#coworking #lareunion #coworkingreunion #entrepreneur #freelance #teletravailler #coliver #colivertropical #974` |

---

## 5. Create Run (POST Supabase RPC)

- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://flqjaqocsugwbkbiuhhk.supabase.co/rest/v1/rpc/dashboard_create_machine_run`
- **Headers** :
  - `apikey` : `<VITE_SUPABASE_ANON_KEY>` (mêmes valeur que celle du front)
  - `Authorization` : `Bearer <VITE_SUPABASE_ANON_KEY>`
  - `Content-Type` : `application/json`
- **Body (JSON)** :
  ```json
  {
    "p_machine_code": "={{ $json.machine_code }}",
    "p_trigger_source": "={{ $json.trigger_source }}",
    "p_user_id": "={{ $json.triggered_by }}"
  }
  ```

Réponse : un UUID (le `run_id`). On le stocke dans le contexte via le node suivant ou
on le récupère avec `$node["Create Run"].json` plus loin.

---

## 6. Claude FB (post Facebook long, storytelling)

- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://api.anthropic.com/v1/messages`
- **Headers** :
  - `x-api-key` : `<DASHBOARD_ANTHROPIC_API_KEY>` (créer un secret n8n)
  - `anthropic-version` : `2023-06-01`
  - `Content-Type` : `application/json`
- **Body (JSON)** :
  ```json
  {
    "model": "claude-opus-4-7",
    "max_tokens": 1024,
    "system": "Tu es ARIA, créatrice de contenu pour {{ $('Set Context').item.json.coworking_name }}, un espace de coworking situé à {{ $('Set Context').item.json.location }}.\n\nContexte du lieu : {{ $('Set Context').item.json.vibe }}\n\nCall-to-action : {{ $('Set Context').item.json.cta_text }} → {{ $('Set Context').item.json.cta_url }}",
    "messages": [
      {
        "role": "user",
        "content": "Génère UN post Facebook attractif pour cette semaine.\n\nFormat :\n- 5 à 8 paragraphes courts, ton storytelling chaleureux\n- Évoque l'ambiance, un détail concret du lieu OU un cas d'usage freelance\n- Termine par le CTA naturellement intégré + l'URL\n- 1 emoji par paragraphe max\n- PAS de hashtags Facebook (peu efficaces)\n- Maximum 1500 caractères\n\nRetourne UNIQUEMENT le texte du post, rien d'autre."
      }
    ]
  }
  ```

Le texte généré sera accessible via `$json.content[0].text`.

---

## 7. Insert FB Draft (POST Supabase RPC)

- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://flqjaqocsugwbkbiuhhk.supabase.co/rest/v1/rpc/dashboard_add_draft`
- **Headers** : (mêmes que Create Run)
- **Body (JSON)** :
  ```json
  {
    "p_run_id": "={{ $('Create Run').item.json }}",
    "p_machine_code": "M01",
    "p_network": "facebook",
    "p_account_handle": "={{ $('Set Context').item.json.fb_handle }}",
    "p_content": "={{ $('Claude FB').item.json.content[0].text }}"
  }
  ```

---

## 8. Claude IG (légende Instagram courte + hashtags)

- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://api.anthropic.com/v1/messages`
- **Headers** : (mêmes que Claude FB)
- **Body (JSON)** :
  ```json
  {
    "model": "claude-opus-4-7",
    "max_tokens": 800,
    "system": "Tu es ARIA, créatrice de contenu pour {{ $('Set Context').item.json.coworking_name }} ({{ $('Set Context').item.json.location }}).\n\nContexte : {{ $('Set Context').item.json.vibe }}\nCTA : {{ $('Set Context').item.json.cta_text }} (Lien en bio).",
    "messages": [
      {
        "role": "user",
        "content": "Génère UNE légende Instagram pour le compte {{ $('Set Context').item.json.ig_handle }}.\n\nFormat :\n- 3 à 5 phrases courtes, punchy, ton inspirant\n- Évite les CTA directs type 'Réserve maintenant !'. Préfère : 'Lien en bio.'\n- 1 emoji par phrase max\n- Termine par une ligne vide puis les hashtags : {{ $('Set Context').item.json.hashtags }}\n- Maximum 800 caractères au total\n\nRetourne UNIQUEMENT le texte de la légende avec ses hashtags, rien d'autre."
      }
    ]
  }
  ```

---

## 9. Insert IG Draft

- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://flqjaqocsugwbkbiuhhk.supabase.co/rest/v1/rpc/dashboard_add_draft`
- **Body (JSON)** :
  ```json
  {
    "p_run_id": "={{ $('Create Run').item.json }}",
    "p_machine_code": "M01",
    "p_network": "instagram",
    "p_account_handle": "={{ $('Set Context').item.json.ig_handle }}",
    "p_content": "={{ $('Claude IG').item.json.content[0].text }}"
  }
  ```

---

## 10. Complete Run (success)

- **Type** : `HTTP Request`
- **Method** : `POST`
- **URL** : `https://flqjaqocsugwbkbiuhhk.supabase.co/rest/v1/rpc/dashboard_complete_machine_run`
- **Body (JSON)** :
  ```json
  {
    "p_run_id": "={{ $('Create Run').item.json }}",
    "p_status": "success",
    "p_summary": "2 drafts générés (FB + IG) — en attente d'approbation"
  }
  ```

---

## Error Trigger (catch-all)

Ajouter un workflow d'erreur séparé qui, sur erreur, appelle :

```json
{
  "p_run_id": "<run_id du contexte erreur>",
  "p_status": "error",
  "p_error": "={{ $json.error.message }}"
}
```

Configuré via Workflow Settings → "Error Workflow".

---

## Secrets n8n à créer

| Nom | Valeur |
|---|---|
| `DASHBOARD_ANTHROPIC_API_KEY` | Clé API Anthropic dédiée au dashboard (préfixée `DASHBOARD_` per convention) |
| `DASHBOARD_SUPABASE_ANON_KEY` | Même valeur que `VITE_SUPABASE_ANON_KEY` du dashboard |

---

## Test du workflow

1. Activer le workflow dans n8n
2. Depuis ton mac :
   ```bash
   curl -X POST https://n8n.makeitapp.fr/webhook/m01-trigger \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: <N8N_WEBHOOK_SECRET>" \
     -d '{"trigger_source":"manual"}'
   ```
3. Vérifier dans Supabase :
   ```sql
   SELECT * FROM dashboard_machine_runs ORDER BY started_at DESC LIMIT 1;
   SELECT * FROM dashboard_posts_drafts WHERE machine_code='M01' ORDER BY created_at DESC LIMIT 2;
   ```
