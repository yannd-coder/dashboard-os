#!/usr/bin/env python3
"""
Patch le workflow n8n M01 pour :
  1. Changer cta_text dans Set Context : "Réserve ton bureau" → "Réserve ton PASS"
  2. Modifier les prompts Claude FB & IG pour que le CTA + URL soit
     en DÉBUT de post (sur la première ligne), pas à la fin.

Lit N8N_API_KEY depuis secrets/secrets.txt.
Requiert un accès réseau à n8n.makeitapp.fr (VPN actif si tu es sur Starlink).

Usage :
    cd dashboard
    python3 n8n/patch_m01_cta.py
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

WORKFLOW_ID = "3lG5bUiIwcD22dVl"
N8N_BASE = "https://n8n.makeitapp.fr"


def load_api_key() -> str:
    import os
    # Priorité 1 : env var (utile quand on run via bucket+curl|python3 sur le VPS)
    env_key = os.environ.get("N8N_API_KEY")
    if env_key:
        return env_key.strip()
    # Priorité 2 : secrets/secrets.txt (run local depuis le Mac)
    secrets_file = Path(__file__).parent.parent / "secrets" / "secrets.txt"
    if not secrets_file.exists():
        sys.exit(f"❌ {secrets_file} introuvable et N8N_API_KEY env var non définie")
    for line in secrets_file.read_text(encoding="utf-8").splitlines():
        if line.startswith("N8N_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("❌ N8N_API_KEY introuvable dans secrets/secrets.txt")


def api_request(method: str, path: str, headers: dict, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(f"{N8N_BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(
            f"❌ HTTP {e.code} {method} {path}: "
            f"{e.read().decode('utf-8', errors='replace')}"
        )
    except urllib.error.URLError as e:
        sys.exit(
            f"❌ Réseau {method} {path}: {e}\n"
            "   → Active ton VPN (le VPS Hostinger filtre les IPs Starlink)."
        )


def patch_set_context(node: dict):
    """Remplace cta_text : 'Réserve ton bureau' → 'Réserve ton PASS'."""
    assignments = (
        node.get("parameters", {})
        .get("assignments", {})
        .get("assignments", [])
    )
    for assign in assignments:
        if assign.get("name") == "cta_text":
            old = assign.get("value", "")
            if old == "Réserve ton PASS":
                return None
            assign["value"] = "Réserve ton PASS"
            return f"cta_text '{old}' → 'Réserve ton PASS'"
    return None


# Patterns exacts à remplacer dans les jsonBody des nodes Claude.
# Pas d'échappement \", on cherche le vrai contenu après parsing JSON.

FB_OLD = (
    '"<texte du post FB : 5 lignes max, 600 caractères, ton ami, '
    'pas de hashtags, termine par CTA + URL>"'
)
FB_NEW = (
    '"<texte du post FB : COMMENCE STRICTEMENT par le CTA + URL (ceux donnés dans '
    'le system prompt) sur la première ligne au format \\"<cta_text> → <cta_url>\\", '
    'puis 1 ligne vide, puis 4-5 lignes de contenu (600 caractères max au total, '
    'ton ami, pas de hashtags)>"'
)

IG_OLD = (
    '"<texte du post IG : 4-6 lignes, emoji ok, finit par " + '
    "$('Set Context').item.json.hashtags + "
    '" et lien en bio (" + '
    "$('Set Context').item.json.cta_url + "
    '")>"'
)
IG_NEW = (
    '"<texte du post IG : COMMENCE STRICTEMENT par le CTA + URL (ceux donnés dans '
    'le system prompt) sur la première ligne au format \\"<cta_text> → <cta_url>\\", '
    'puis 1 ligne vide, puis 4-5 lignes de contenu (emoji ok), puis les hashtags " + '
    "$('Set Context').item.json.hashtags + "
    '" sur la dernière ligne>"'
)


def patch_claude_node(node: dict, network: str):
    params = node.get("parameters", {})
    body = params.get("jsonBody", "")
    if not body:
        return None

    if "COMMENCE STRICTEMENT" in body:
        return None  # déjà patché

    # On va remplacer la consigne "caption" complète, peu importe sa forme exacte.
    # On cherche la partie entre `"caption": "<...>"` et on remplace par notre version.
    import re
    # Pattern : "caption": "<...n'importe quoi sans " non échappé...>"
    # Note : le jsonBody est une string template JS qui contient du JSON échappé.
    # Dans le body, on cherche : \"caption\": \"<...>\"
    pat = re.compile(r'\\"caption\\":\s*\\"<[^>]*>\\"')
    matches = pat.findall(body)
    if not matches:
        print(f"\n--- DEBUG {network} jsonBody (premiers 800 chars) ---")
        print(body[:800])
        print("--- END DEBUG ---\n")
        return f"⚠️ pattern caption non trouvé — voir DEBUG ci-dessus"

    if network == "FB":
        new_caption = (
            r'\"caption\": \"<texte du post FB : COMMENCE STRICTEMENT par '
            r'\\\"\" + $(\'Set Context\').item.json.cta_text + \" → \" + '
            r'$(\'Set Context\').item.json.cta_url + \"\\\" sur la première ligne, '
            r'puis une ligne vide, puis 4-5 lignes de contenu (600 chars max, '
            r'ton ami, pas de hashtags). Le CTA ne doit JAMAIS être à la fin.>\"'
        )
    else:  # IG
        new_caption = (
            r'\"caption\": \"<texte du post IG : COMMENCE STRICTEMENT par '
            r'\\\"\" + $(\'Set Context\').item.json.cta_text + \" → \" + '
            r'$(\'Set Context\').item.json.cta_url + \"\\\" sur la première ligne, '
            r'puis une ligne vide, puis 4-5 lignes de contenu (emoji ok), '
            r'puis les hashtags \" + $(\'Set Context\').item.json.hashtags + '
            r'\" sur la dernière ligne>\"'
        )

    # On remplace TOUS les matches (normalement il n'y en a qu'un par node)
    new_body = pat.sub(new_caption, body, count=1)
    if new_body == body:
        return f"⚠️ replace n'a rien changé"
    params["jsonBody"] = new_body
    return f"caption prompt mis à jour (CTA en début, {len(matches)} match)"


def main():
    api_key = load_api_key()
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    print(f"→ Fetch workflow {WORKFLOW_ID}...")
    workflow = api_request("GET", f"/api/v1/workflows/{WORKFLOW_ID}", headers)
    print(f"  Nom: {workflow['name']}, {len(workflow['nodes'])} nodes\n")

    changes = []
    for node in workflow["nodes"]:
        name = node.get("name", "")
        if name == "Set Context":
            r = patch_set_context(node)
            if r:
                changes.append(f"  • Set Context : {r}")
        elif name == "Claude FB":
            r = patch_claude_node(node, "FB")
            if r:
                changes.append(f"  • Claude FB : {r}")
        elif name == "Claude IG":
            r = patch_claude_node(node, "IG")
            if r:
                changes.append(f"  • Claude IG : {r}")

    if not changes:
        print("⚠️  Aucun changement à appliquer (déjà patché ou patterns introuvables).")
        return

    print("Changements à appliquer :")
    for c in changes:
        print(c)

    print("\n→ Push workflow patché...")
    # n8n n'accepte qu'un sous-ensemble de champs dans settings via API REST.
    # On garde uniquement les champs whitelistés.
    allowed_settings = {
        "executionOrder", "saveExecutionProgress", "saveManualExecutions",
        "saveDataErrorExecution", "saveDataSuccessExecution",
        "errorWorkflow", "timezone", "callerPolicy",
    }
    raw_settings = workflow.get("settings", {}) or {}
    clean_settings = {k: v for k, v in raw_settings.items() if k in allowed_settings}
    put_body = {
        "name": workflow["name"],
        "nodes": workflow["nodes"],
        "connections": workflow["connections"],
        "settings": clean_settings,
    }
    result = api_request("PUT", f"/api/v1/workflows/{WORKFLOW_ID}", headers, put_body)
    print(f"✓ Workflow updated (id={result.get('id')}, active={result.get('active')})")
    print("\n✅ Done. Le prochain run M01 commencera les posts par 'Réserve ton PASS → https://...'")


if __name__ == "__main__":
    main()
