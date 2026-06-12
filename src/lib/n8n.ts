const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
const WEBHOOK_SECRET = import.meta.env.VITE_N8N_WEBHOOK_SECRET as string | undefined;

export function isN8nConfigured(): boolean {
  return Boolean(WEBHOOK_URL && WEBHOOK_SECRET);
}

export async function triggerMachine(params: {
  machineCode: string;
  triggeredBy?: string | null;
}): Promise<void> {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    throw new Error('Webhook n8n non configuré (VITE_N8N_WEBHOOK_URL / VITE_N8N_WEBHOOK_SECRET).');
  }
  // VITE_N8N_WEBHOOK_URL pointe sur m01-trigger ; on dérive le path des autres machines
  const url = WEBHOOK_URL.replace(/[^/]+$/, `${params.machineCode.toLowerCase()}-trigger`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      machine_code: params.machineCode,
      trigger_source: 'manual',
      triggered_by: params.triggeredBy ?? null,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`n8n a renvoyé ${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
  }
}
