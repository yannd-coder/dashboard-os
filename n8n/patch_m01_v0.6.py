"""Patch M01 workflow pour V0.6 — ajout génération de visuels.

Chaîne après patch :
  Webhook/Schedule → Merge → Set Context → Pick Photo → Create Run
  → Claude FB → Render FB → Upload FB → Insert FB Draft
  → Claude IG → Render IG → Upload IG → Insert IG Draft → Complete Run
"""
import json
import uuid as uuidlib

SUPABASE_URL = "https://flqjaqocsugwbkbiuhhk.supabase.co"
SUPABASE_ANON = "sb_publishable_ZEztH4rLAFrFBBYGEhRy9w_FOiCic-m"
# Token fallback hardcodé dans docker-compose ; override possible via BROWSERLESS_TOKEN secret GH Actions
BROWSERLESS_TOKEN = "yannos-browserless-local-only"
# URL interne (dans réseau dashboard-net) pour browserless. Sinon https://dashboard.makeitapp.fr
TEMPLATE_URL_INTERNAL = "http://dashboard:80/templates/visual.html"
BROWSERLESS_URL = f"http://host.docker.internal:3001/screenshot?token={BROWSERLESS_TOKEN}"

SUBTITLE_L1 = "VILLA COLIVER"
SUBTITLE_L2 = "SAINT-PIERRE"

with open("/tmp/m01_workflow.json") as f:
    wf = json.load(f)

# ---------- nettoie les champs non-acceptés en PUT (selon doc n8n API v1) ----------
# Garde uniquement les champs utiles à la mise à jour
KEEP_TOP = ["name", "nodes", "connections", "settings", "staticData"]
for k in list(wf.keys()):
    if k not in KEEP_TOP:
        del wf[k]
wf.setdefault("settings", {})

nodes = wf["nodes"]
connections = wf["connections"]

def find_node(name):
    for n in nodes:
        if n["name"] == name:
            return n
    raise KeyError(name)

# ---------- 1. Modifier Claude FB prompt pour JSON output ----------
claude_fb = find_node("Claude FB")
claude_fb["parameters"]["jsonBody"] = "={{ (() => {\n  const themes = [\n    \"Coworking tropical : ambiance nature, palmiers, espaces intérieurs/extérieurs\",\n    \"Digital nomad : remote work, fibre, décalage horaire, qualité de vie\",\n    \"Communauté : rencontres, échanges, colivers, entraide\",\n    \"Lifestyle Réunion : surf, randonnée, bassins, street food créole\",\n    \"Work & Chill : équilibre pro/perso, hamac, piscine, productivité\"\n  ];\n  const theme = themes[Math.floor(Math.random() * themes.length)];\n  return JSON.stringify({\n    model: \"claude-opus-4-7\",\n    max_tokens: 700,\n    system: \"Tu es ARIA, créatrice de contenu pour \" + $('Set Context').item.json.coworking_name + \" (\" + $('Set Context').item.json.location + \"). Vibe : \" + $('Set Context').item.json.vibe + \". CTA : \" + $('Set Context').item.json.cta_text + \" \\u2192 \" + $('Set Context').item.json.cta_url + \". Tu réponds UNIQUEMENT avec un objet JSON valide, rien d'autre, pas de markdown.\",\n    messages: [{ role: \"user\", content: \"Génère UN post Facebook + UNE accroche visuelle pour ce thème : \\\"\" + theme + \"\\\".\\n\\nRetourne STRICTEMENT cet objet JSON, rien d'autre :\\n{\\n  \\\"caption\\\": \\\"<texte du post FB : 5 lignes max, 600 caractères, ton ami, pas de hashtags, termine par CTA + URL>\\\",\\n  \\\"accroche_visuel\\\": \\\"<phrase courte 3-6 mots qui sera affichée en gros sur une photo, style poétique/aspirationnel, peut être sur 2-3 lignes séparées par \\\\\\\\n>\\\"\\n}\\n\\nCTA URL à inclure dans caption : \" + $('Set Context').item.json.cta_url + \"\\n\\nExemple d'accroche_visuel : \\\"Travailler les pieds dans l'eau\\\" ou \\\"Pose ton ordi\\\\\\\\nsous les palmiers\\\". Pas de ponctuation finale.\" }]\n  });\n})() }}"

# ---------- 2. Modifier Claude IG prompt idem ----------
claude_ig = find_node("Claude IG")
claude_ig["parameters"]["jsonBody"] = "={{ (() => {\n  const themes = [\n    \"Coworking tropical : ambiance nature, palmiers, espaces intérieurs/extérieurs\",\n    \"Digital nomad : remote work, fibre, décalage horaire, qualité de vie\",\n    \"Communauté : rencontres, échanges, colivers, entraide\",\n    \"Lifestyle Réunion : surf, randonnée, bassins, street food créole\",\n    \"Work & Chill : équilibre pro/perso, hamac, piscine, productivité\"\n  ];\n  const theme = themes[Math.floor(Math.random() * themes.length)];\n  return JSON.stringify({\n    model: \"claude-opus-4-7\",\n    max_tokens: 700,\n    system: \"Tu es ARIA, créatrice de contenu pour \" + $('Set Context').item.json.coworking_name + \" (\" + $('Set Context').item.json.location + \"). Vibe : \" + $('Set Context').item.json.vibe + \". CTA : \" + $('Set Context').item.json.cta_text + \" \\u2192 \" + $('Set Context').item.json.cta_url + \". Tu réponds UNIQUEMENT avec un objet JSON valide, rien d'autre, pas de markdown.\",\n    messages: [{ role: \"user\", content: \"Génère UN post Instagram + UNE accroche visuelle pour ce thème : \\\"\" + theme + \"\\\".\\n\\nRetourne STRICTEMENT cet objet JSON, rien d'autre :\\n{\\n  \\\"caption\\\": \\\"<texte du post IG : 4-6 lignes, emoji ok, finit par \" + $('Set Context').item.json.hashtags + \" et lien en bio (\" + $('Set Context').item.json.cta_url + \")>\\\",\\n  \\\"accroche_visuel\\\": \\\"<phrase courte 3-6 mots qui sera affichée en gros sur une photo, style poétique/aspirationnel, peut être sur 2-3 lignes séparées par \\\\\\\\n>\\\"\\n}\\n\\nExemple d'accroche_visuel : \\\"Travailler les pieds dans l'eau\\\" ou \\\"Pose ton ordi\\\\\\\\nsous les palmiers\\\". Pas de ponctuation finale.\" }]\n  });\n})() }}"

# ---------- 3. Nouveau nœud "Pick Photo" ----------
pick_photo = {
    "parameters": {
        "method": "POST",
        "url": f"{SUPABASE_URL}/rest/v1/rpc/dashboard_random_campaign_photo",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "apikey", "value": SUPABASE_ANON},
                {"name": "Authorization", "value": f"Bearer {SUPABASE_ANON}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "{}",
        "options": {},
    },
    "id": str(uuidlib.uuid4()),
    "name": "Pick Photo",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [620, 280],
}
nodes.append(pick_photo)

# ---------- 4. Helper qui construit la requête browserless ----------
def make_render_node(name, claude_node_name, position):
    """Crée un nœud HTTP qui POST à browserless. La réponse est un PNG binaire dans data."""
    js_body = (
        "={{ (() => {\n"
        f"  const photoUrl = $('Pick Photo').item.json.public_url;\n"
        f"  const claudeRaw = $('{claude_node_name}').item.json.content[0].text;\n"
        "  let accroche = 'Bienvenue';\n"
        "  try { accroche = JSON.parse(claudeRaw).accroche_visuel || accroche; } catch(e) {}\n"
        "  const qs = new URLSearchParams({\n"
        "    format: 'square',\n"
        "    photo: photoUrl,\n"
        "    accroche: accroche,\n"
        f"    l1: '{SUBTITLE_L1}',\n"
        f"    l2: '{SUBTITLE_L2}'\n"
        "  });\n"
        f"  const url = '{TEMPLATE_URL_INTERNAL}?' + qs.toString();\n"
        "  return JSON.stringify({\n"
        "    url: url,\n"
        "    options: { type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } },\n"
        "    viewport: { width: 1080, height: 1080, deviceScaleFactor: 1 },\n"
        "    gotoOptions: { waitUntil: 'networkidle0', timeout: 20000 }\n"
        "  });\n"
        "})() }}"
    )
    return {
        "parameters": {
            "method": "POST",
            "url": BROWSERLESS_URL,
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "Content-Type", "value": "application/json"},
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": js_body,
            "options": {
                "response": {
                    "response": {
                        "responseFormat": "file",
                        "outputPropertyName": "data",
                    }
                },
                "timeout": 30000,
            },
        },
        "id": str(uuidlib.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": position,
    }

# ---------- 5. Helper qui construit l'upload Supabase Storage ----------
def make_upload_node(name, render_node_name, position, network_short):
    """Upload binaire dans campaign-photos/generated/<run_id>-<fb|ig>.png."""
    url_expr = (
        f"={{{{ '{SUPABASE_URL}/storage/v1/object/campaign-photos/generated/' "
        f"+ $('Create Run').item.json.data + '-{network_short}.png' }}}}"
    )
    return {
        "parameters": {
            "method": "POST",
            "url": url_expr,
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "apikey", "value": SUPABASE_ANON},
                    {"name": "Authorization", "value": f"Bearer {SUPABASE_ANON}"},
                    {"name": "Content-Type", "value": "image/png"},
                    {"name": "x-upsert", "value": "true"},
                    {"name": "Cache-Control", "value": "max-age=31536000"},
                ]
            },
            "sendBody": True,
            "contentType": "binaryData",
            "inputDataFieldName": "data",
            "options": {},
        },
        "id": str(uuidlib.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": position,
    }

# ---------- 6. Insérer les nouveaux nœuds ----------
render_fb = make_render_node("Render FB Visual", "Claude FB", [1620, 280])
upload_fb = make_upload_node("Upload FB Visual", "Render FB Visual", [1820, 280], "fb")
render_ig = make_render_node("Render IG Visual", "Claude IG", [2620, 280])
upload_ig = make_upload_node("Upload IG Visual", "Render IG Visual", [2820, 280], "ig")
nodes.extend([render_fb, upload_fb, render_ig, upload_ig])

# ---------- 7. Modifier Insert FB Draft pour utiliser caption + image_urls ----------
insert_fb = find_node("Insert FB Draft")
insert_fb["parameters"]["jsonBody"] = (
    "={{ (() => {\n"
    "  const raw = $('Claude FB').item.json.content[0].text;\n"
    "  let parsed = {};\n"
    "  try { parsed = JSON.parse(raw); } catch(e) { parsed = { caption: raw, accroche_visuel: '' }; }\n"
    "  const visualUrl = '" + SUPABASE_URL + "/storage/v1/object/public/campaign-photos/generated/' + $('Create Run').item.json.data + '-fb.png';\n"
    "  return JSON.stringify({\n"
    "    p_run_id: $('Create Run').item.json.data,\n"
    "    p_machine_code: 'M01',\n"
    "    p_network: 'facebook',\n"
    "    p_account_handle: $('Set Context').item.json.fb_handle,\n"
    "    p_content: parsed.caption || raw,\n"
    "    p_image_urls: { square: visualUrl }\n"
    "  });\n"
    "})() }}"
)

# ---------- 8. Modifier Insert IG Draft idem ----------
insert_ig = find_node("Insert IG Draft")
insert_ig["parameters"]["jsonBody"] = (
    "={{ (() => {\n"
    "  const raw = $('Claude IG').item.json.content[0].text;\n"
    "  let parsed = {};\n"
    "  try { parsed = JSON.parse(raw); } catch(e) { parsed = { caption: raw, accroche_visuel: '' }; }\n"
    "  const visualUrl = '" + SUPABASE_URL + "/storage/v1/object/public/campaign-photos/generated/' + $('Create Run').item.json.data + '-ig.png';\n"
    "  return JSON.stringify({\n"
    "    p_run_id: $('Create Run').item.json.data,\n"
    "    p_machine_code: 'M01',\n"
    "    p_network: 'instagram',\n"
    "    p_account_handle: $('Set Context').item.json.ig_handle,\n"
    "    p_content: parsed.caption || raw,\n"
    "    p_image_urls: { square: visualUrl }\n"
    "  });\n"
    "})() }}"
)

# ---------- 9. Réécrire les connexions ----------
# Avant : Set Context → Create Run → Claude FB → Insert FB → Claude IG → Insert IG → Complete Run
# Après : Set Context → Pick Photo → Create Run → Claude FB → Render FB → Upload FB → Insert FB
#        → Claude IG → Render IG → Upload IG → Insert IG → Complete Run

def link(src, dst):
    connections.setdefault(src, {"main": [[]]})
    connections[src]["main"][0] = [{"node": dst, "type": "main", "index": 0}]

# Reset les liens qu'on va remplacer
for src in ["Set Context", "Create Run", "Claude FB", "Insert FB Draft", "Claude IG", "Insert IG Draft"]:
    if src in connections:
        connections[src]["main"][0] = []

link("Set Context", "Pick Photo")
link("Pick Photo", "Create Run")
link("Create Run", "Claude FB")
link("Claude FB", "Render FB Visual")
link("Render FB Visual", "Upload FB Visual")
link("Upload FB Visual", "Insert FB Draft")
link("Insert FB Draft", "Claude IG")
link("Claude IG", "Render IG Visual")
link("Render IG Visual", "Upload IG Visual")
link("Upload IG Visual", "Insert IG Draft")
link("Insert IG Draft", "Complete Run")

# ---------- 10. Sauvegarde ----------
with open("/tmp/m01_workflow_patched.json", "w") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)
print("Patched workflow saved.")
print("Nodes:")
for n in nodes:
    print(f"  - {n['name']}")
