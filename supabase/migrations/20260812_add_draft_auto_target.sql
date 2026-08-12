-- Fix : dashboard_add_draft déduit target_id de (machine_code, network) si non fourni
-- (les workflows v2 n'envoient pas p_target_id → drafts invisibles pour le publisher)
BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_add_draft(
  p_run_id uuid, p_machine_code text, p_network text, p_account_handle text, p_content text,
  p_image_urls jsonb DEFAULT NULL::jsonb, p_visual_accroche text DEFAULT NULL::text,
  p_visual_photo_url text DEFAULT NULL::text, p_target_id uuid DEFAULT NULL::uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_target uuid;
BEGIN
  v_target := p_target_id;
  IF v_target IS NULL THEN
    SELECT id INTO v_target
    FROM public.dashboard_publish_targets
    WHERE machine_code = p_machine_code AND platform = p_network AND is_active
    LIMIT 1;
  END IF;

  INSERT INTO public.dashboard_posts_drafts (
    machine_run_id, machine_code, network, account_handle, content,
    image_urls, visual_accroche, visual_photo_url, target_id
  )
  VALUES (
    p_run_id, p_machine_code, p_network, p_account_handle, p_content,
    p_image_urls, p_visual_accroche, p_visual_photo_url, v_target
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

-- Backfill des drafts récents sans target
UPDATE public.dashboard_posts_drafts d
SET target_id = t.id
FROM public.dashboard_publish_targets t
WHERE d.target_id IS NULL
  AND d.machine_code = t.machine_code
  AND d.network = t.platform;

COMMIT;
