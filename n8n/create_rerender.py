"""Crée le workflow M01-Rerender-Visual via API n8n POST /workflows."""
import json
import uuid as uuidlib

SUPABASE_URL = "https://flqjaqocsugwbkbiuhhk.supabase.co"
SUPABASE_ANON = "sb_publishable_ZEztH4rLAFrFBBYGEhRy9w_FOiCic-m"
BROWSERLESS_TOKEN = "yannos-browserless-local-only"
TEMPLATE_URL_INTERNAL = "http://dashboard:80/templates/visual.html"
BROWSERLESS_URL = f"http://host.docker.internal:3001/screenshot?token={BROWSERLESS_TOKEN}"
SUBTITLE_L1 = "VILLA COLIVER"
SUBTITLE_L2 = "SAINT-PIERRE"


def nid():
    return str(uuidlib.uuid4())


nodes = [
    # 1. Webhook
    {
        "parameters": {
            "httpMethod": "POST",
            "path": "m01-rerender-visual",
            "responseMode": "lastNode",
            "options": {},
        },
        "id": nid(),
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [200, 300],
        "webhookId": "m01-rerender-visual",
    },
    # 2. Get Draft (PostgREST GET avec single object)
    {
        "parameters": {
            "method": "GET",
            "url": f"={{{{ '{SUPABASE_URL}/rest/v1/dashboard_posts_drafts?id=eq.' + $('Webhook').item.json.body.draft_id + '&select=id,machine_run_id,network,visual_photo_url,visual_accroche' }}}}",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "apikey", "value": SUPABASE_ANON},
                    {"name": "Authorization", "value": f"Bearer {SUPABASE_ANON}"},
                    {"name": "Accept", "value": "application/vnd.pgrst.object+json"},
                ]
            },
            "options": {},
        },
        "id": nid(),
        "name": "Get Draft",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [400, 300],
    },
    # 3. Render Visual
    {
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
            "jsonBody": (
                "={{ (() => {\n"
                "  const draft = $('Get Draft').item.json;\n"
                "  const webhook = $('Webhook').item.json.body;\n"
                "  const photoUrl = draft.visual_photo_url || '';\n"
                "  const accroche = webhook.new_accroche || draft.visual_accroche || '';\n"
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
            ),
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
        "id": nid(),
        "name": "Render Visual",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [600, 300],
    },
    # 4. Upload Visual (overwrite existing at same path)
    {
        "parameters": {
            "method": "POST",
            "url": (
                f"={{{{ '{SUPABASE_URL}/storage/v1/object/campaign-photos/generated/' "
                f"+ $('Get Draft').item.json.machine_run_id + '-' "
                f"+ ($('Get Draft').item.json.network === 'instagram' ? 'ig' : 'fb') + '.png' }}}}"
            ),
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
        "id": nid(),
        "name": "Upload Visual",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [800, 300],
    },
    # 5. Update Draft via RPC
    {
        "parameters": {
            "method": "POST",
            "url": f"{SUPABASE_URL}/rest/v1/rpc/dashboard_update_draft",
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
            "jsonBody": (
                "={{ (() => {\n"
                "  const draft = $('Get Draft').item.json;\n"
                "  const webhook = $('Webhook').item.json.body;\n"
                "  const network = draft.network === 'instagram' ? 'ig' : 'fb';\n"
                "  const ts = Date.now();\n"
                f"  const newUrl = '{SUPABASE_URL}/storage/v1/object/public/campaign-photos/generated/' "
                "+ draft.machine_run_id + '-' + network + '.png?v=' + ts;\n"
                "  return JSON.stringify({\n"
                "    p_draft_id: draft.id,\n"
                "    p_user_id: webhook.user_id,\n"
                "    p_visual_accroche: webhook.new_accroche || draft.visual_accroche,\n"
                "    p_image_urls: { square: newUrl }\n"
                "  });\n"
                "})() }}"
            ),
            "options": {
                "response": {
                    "response": {
                        "responseFormat": "text"
                    }
                }
            },
        },
        "id": nid(),
        "name": "Update Draft",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1000, 300],
    },
    # 6. Respond
    {
        "parameters": {
            "assignments": {
                "assignments": [
                    {
                        "id": nid(),
                        "name": "success",
                        "value": "=true",
                        "type": "boolean",
                    },
                    {
                        "id": nid(),
                        "name": "image_url",
                        "value": (
                            "={{ (() => {\n"
                            "  const draft = $('Get Draft').item.json;\n"
                            "  const network = draft.network === 'instagram' ? 'ig' : 'fb';\n"
                            f"  return '{SUPABASE_URL}/storage/v1/object/public/campaign-photos/generated/' "
                            "+ draft.machine_run_id + '-' + network + '.png?v=' + Date.now();\n"
                            "})() }}"
                        ),
                        "type": "string",
                    },
                ]
            },
            "options": {},
        },
        "id": nid(),
        "name": "Respond",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [1200, 300],
    },
]

connections = {
    "Webhook": {"main": [[{"node": "Get Draft", "type": "main", "index": 0}]]},
    "Get Draft": {"main": [[{"node": "Render Visual", "type": "main", "index": 0}]]},
    "Render Visual": {"main": [[{"node": "Upload Visual", "type": "main", "index": 0}]]},
    "Upload Visual": {"main": [[{"node": "Update Draft", "type": "main", "index": 0}]]},
    "Update Draft": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]},
}

wf = {
    "name": "M01 — Rerender Visual",
    "nodes": nodes,
    "connections": connections,
    "settings": {"executionOrder": "v1"},
}

with open("/tmp/m01_rerender.json", "w") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)
print("Workflow JSON saved.")
