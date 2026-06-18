# Templates HTML pour Browserless

## `visual_template.html`

Template de visuel pour M01 — photo de fond + bandeau gris + accroche script + sous-titre 2 lignes + logo Coliver.

**Logo Coliver embarqué en base64** (~200 KB) → pas de dépendance externe.
**Polices Allura + Montserrat** chargées depuis Google Fonts (CDN).

### Placeholders à substituer côté n8n

| Placeholder | Type | Exemple |
|---|---|---|
| `{{FORMAT}}` | string | `square` \| `story` \| `banner` |
| `{{PHOTO_URL}}` | URL | URL Supabase Storage de la photo de fond |
| `{{ACCROCHE_HTML}}` | HTML | `Ton bureau<br>les pieds<br>dans l'eau` (convertir les `\n` du LLM en `<br>` côté n8n) |
| `{{SUBTITLE_LINE1}}` | string | `VILLA COLIVER` |
| `{{SUBTITLE_LINE2}}` | string | `SAINT-PIERRE` |

### Dimensions browserless

| Format | Viewport `width × height` |
|---|---|
| `square` | `1080 × 1080` |
| `story` | `1080 × 1920` |
| `banner` | `1200 × 630` |

### Appel browserless v2

```http
POST http://browserless:3000/screenshot?token=$BROWSERLESS_TOKEN
Content-Type: application/json

{
  "html": "<le HTML après substitution>",
  "options": {
    "type": "png",
    "fullPage": false,
    "clip": { "x": 0, "y": 0, "width": 1080, "height": 1080 }
  },
  "viewport": { "width": 1080, "height": 1080, "deviceScaleFactor": 1 },
  "gotoOptions": { "waitUntil": "networkidle0" }
}
```

Réponse : PNG binaire dans le body.

### Fichiers

- `visual_template.tpl.html` — squelette avec `__LOGO_BASE64__` (utile pour régénérer si le logo change)
- `visual_template.html` — template final avec logo inliné (à utiliser dans n8n)

### Régénérer le template si le logo change

```bash
base64 -i path/to/new-logo.png | tr -d '\n' > /tmp/logo_b64.txt
python3 -c "
with open('/tmp/logo_b64.txt') as f: b64 = f.read().strip()
with open('n8n/templates/visual_template.tpl.html') as f: tpl = f.read()
with open('n8n/templates/visual_template.html', 'w') as f:
    f.write(tpl.replace('__LOGO_BASE64__', b64))
"
```
