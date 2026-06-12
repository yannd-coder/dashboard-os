# M02 — Réponse Prospects ARIA (n8n)

> Workflow n8n id `LrozR6S6eT729sil` — créé **par API** le 2026-06-12 (pas via l'UI).
> JSON versionné : `n8n/M02_workflow.json` (clé Anthropic remplacée par un placeholder).
> Statut : **actif**, e2e validé via webhook. En attente : credential IMAP + clé Lodgify.

## Pipeline

```
Webhook m02-trigger ─┐
                     ├─ Merge → Normalize Email → Create Run → Claude Classify → Is Prospect?
Email IMAP (OFF) ────┘                                                              │
                                                                          true      │ false
                                                                            ▼       ▼
                                                  Lodgify Dispos (OFF) → Claude Reply   Complete Run (ignore)
                                                            → Insert Prospect → Insert Response Draft → Complete Run
```

- **Webhook** `POST /webhook/m02-trigger` (header `X-Webhook-Secret` vérifié par Caddy).
  Accepte un payload de test : `{email_from, subject, body, message_id, received_at}` → permet l'e2e sans boîte mail.
- **Email IMAP** : node **désactivé** en attendant la boîte `contact@coliver.re` / `contact.coliver@gmail.com`.
- **Normalize Email** : unifie webhook/IMAP (`$json.body?.X || $json.X`), `trigger_source` = `manual` si webhook, `webhook` si IMAP (leçon M01 : ne pas hardcoder).
- **Claude Classify** : JSON strict `{is_prospect, source, summary, checkin, checkout, persons}`. Spam/newsletters/factures → false.
- **Lodgify Dispos** : node **désactivé** (placeholder `LODGIFY_API_KEY_A_REMPLACER`), `onError: continue`.
- **Claude Reply** : ton chaleureux/convivial/pro, n'invente JAMAIS prix ni dispos, propose https://coliver-coworking-book.makeitapp.fr, max 150 mots, signe "L'équipe Coliver Tropical".
- **Dédup** : `dashboard_add_prospect` est idempotent sur `message_id` (pas de doublon si le même email est relu).

## ⚠️ Piège n8n découvert (à retenir pour M03/M04)

Les HTTP Request vers Supabase RPC doivent avoir `options.response.response.responseFormat = "text"`.
Sans ça : erreur **"Response body is not valid JSON"** (PostgREST renvoie un scalaire JSON `"uuid"` que
le node n'autodétecte pas). En mode text, n8n déballe proprement → `$('Node').item.json.data` = uuid nu.

## Reste à brancher (avec Yann)

### 1. Boîte mail (credential IMAP)
Quand `contact@coliver.re` (O2switch : `mail.coliver.re:993` SSL) ou Gmail (app password) existe :
```bash
# créer le credential par API
curl -X POST https://n8n.makeitapp.fr/api/v1/credentials \
  -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Coliver Contact IMAP","type":"imap","data":{"user":"contact@coliver.re","password":"...","host":"mail.coliver.re","port":993,"secure":true}}'
```
Puis : associer le credential au node `Email IMAP`, retirer `disabled`, re-PUT le workflow, ré-activer.
Rediriger vers cette boîte : notifications Lodgify, formulaire du site, transfert depuis la boîte de Mathias.

### 2. Lodgify (dispos + tarifs réels)
- Clé : Lodgify → Settings → Public API → coller dans le node `Lodgify Dispos` (header `X-ApiKey`)
- Endpoint à affiner : `/v2/properties` puis `/v2/availability/{propertyId}?start=&end=` avec les dates extraites par Claude Classify
- Retirer `disabled` + enrichir le prompt de `Claude Reply` avec les données (`$json` = sortie Lodgify)

### 3. V2 — bouton "Envoyer"
Draft approuvé → envoi réel par SMTP/Gmail (statut `sent` déjà prévu en base).

## Test e2e manuel

```bash
curl -X POST https://n8n.makeitapp.fr/webhook/m02-trigger \
  -H "Content-Type: application/json" -H "X-Webhook-Secret: $SECRET" \
  -d '{"machine_code":"M02","trigger_source":"manual","email_from":"test@example.com","subject":"Dispo ?","body":"Bonjour, 2 postes coworking en janvier ?","message_id":"test-unique-id"}'
# → run success + prospect + draft pending sur https://dashboard.makeitapp.fr/machines/M02
```
