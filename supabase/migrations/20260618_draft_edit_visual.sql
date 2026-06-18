-- V0.7 — Édition du texte + accroche visuelle sur les drafts pending
-- Appliquée le 2026-06-18 via MCP Supabase.

ALTER TABLE public.dashboard_posts_drafts
  ADD COLUMN IF NOT EXISTS visual_accroche text,
  ADD COLUMN IF NOT EXISTS visual_photo_url text;

COMMENT ON COLUMN public.dashboard_posts_drafts.visual_accroche
  IS 'Accroche script affichée sur le visuel (3-6 mots). Modifiable depuis le DraftCard.';
COMMENT ON COLUMN public.dashboard_posts_drafts.visual_photo_url
  IS 'URL publique de la photo de fond utilisée. Permet de regénérer le PNG avec une nouvelle accroche.';

CREATE OR REPLACE FUNCTION public.dashboard_add_draft(
  p_run_id uuid,
  p_machine_code text,
  p_network text,
  p_account_handle text,
  p_content text,
  p_image_urls jsonb DEFAULT NULL,
  p_visual_accroche text DEFAULT NULL,
  p_visual_photo_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_posts_drafts (
    machine_run_id, machine_code, network, account_handle, content,
    image_urls, visual_accroche, visual_photo_url
  )
  VALUES (
    p_run_id, p_machine_code, p_network, p_account_handle, p_content,
    p_image_urls, p_visual_accroche, p_visual_photo_url
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_add_draft(uuid, text, text, text, text, jsonb, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_update_draft(
  p_draft_id uuid,
  p_user_id uuid,
  p_content text DEFAULT NULL,
  p_visual_accroche text DEFAULT NULL,
  p_image_urls jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_users
    WHERE id = p_user_id AND is_approved = true
  ) THEN
    RAISE EXCEPTION 'user not approved';
  END IF;

  UPDATE public.dashboard_posts_drafts
  SET
    content = COALESCE(p_content, content),
    visual_accroche = COALESCE(p_visual_accroche, visual_accroche),
    image_urls = COALESCE(p_image_urls, image_urls)
  WHERE id = p_draft_id AND status = 'pending';

  RETURN FOUND;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_update_draft(uuid, uuid, text, text, jsonb)
  TO anon, authenticated;
