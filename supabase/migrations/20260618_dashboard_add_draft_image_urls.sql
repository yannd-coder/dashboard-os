-- V0.6 — Étendre dashboard_add_draft pour accepter p_image_urls (jsonb).
-- Backward compat : DEFAULT NULL → les anciens appels n8n continuent de marcher.
-- Appliquée le 2026-06-18 via MCP Supabase.

CREATE OR REPLACE FUNCTION public.dashboard_add_draft(
  p_run_id uuid,
  p_machine_code text,
  p_network text,
  p_account_handle text,
  p_content text,
  p_image_urls jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_posts_drafts (
    machine_run_id, machine_code, network, account_handle, content, image_urls
  )
  VALUES (p_run_id, p_machine_code, p_network, p_account_handle, p_content, p_image_urls)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_add_draft(uuid, text, text, text, text, jsonb)
  TO anon, authenticated;
