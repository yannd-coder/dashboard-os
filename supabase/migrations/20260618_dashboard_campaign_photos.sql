-- ============================================================
-- V0.6 — Bibliothèque de photos pour génération de visuels M01
-- Appliquée le 2026-06-18 via MCP Supabase.
-- ============================================================

-- 1. Bucket Storage 'campaign-photos' (public en lecture, 5 MB max, JPEG/PNG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-photos',
  'campaign-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Policies storage.objects pour le bucket 'campaign-photos'
--    Pattern Yann : anon write autorisé sur le bucket,
--    le vrai contrôle d'accès est dans les RPC qui check le role en DB.
DROP POLICY IF EXISTS "campaign_photos_public_read" ON storage.objects;
CREATE POLICY "campaign_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-photos');

DROP POLICY IF EXISTS "campaign_photos_anon_insert" ON storage.objects;
CREATE POLICY "campaign_photos_anon_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-photos');

DROP POLICY IF EXISTS "campaign_photos_anon_delete" ON storage.objects;
CREATE POLICY "campaign_photos_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'campaign-photos');

-- 3. Table metadata
CREATE TABLE IF NOT EXISTS public.dashboard_campaign_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  alt text,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES public.dashboard_users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_campaign_photos_active_idx
  ON public.dashboard_campaign_photos (is_active, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS dashboard_campaign_photos_tags_gin_idx
  ON public.dashboard_campaign_photos USING gin (tags);

ALTER TABLE public.dashboard_campaign_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_photos_anon_select" ON public.dashboard_campaign_photos;
CREATE POLICY "campaign_photos_anon_select"
  ON public.dashboard_campaign_photos FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Helper interne : assert role admin/superadmin
CREATE OR REPLACE FUNCTION public._dashboard_assert_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_users
    WHERE id = p_user_id
      AND role IN ('superadmin', 'admin')
      AND is_approved = true
  ) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
END;
$$;

-- 5. RPC create
CREATE OR REPLACE FUNCTION public.dashboard_create_campaign_photo(
  p_user_id uuid,
  p_storage_path text,
  p_public_url text,
  p_alt text DEFAULT NULL,
  p_tags text[] DEFAULT '{}'
)
RETURNS public.dashboard_campaign_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.dashboard_campaign_photos;
BEGIN
  PERFORM public._dashboard_assert_admin(p_user_id);

  INSERT INTO public.dashboard_campaign_photos
    (storage_path, public_url, alt, tags, uploaded_by)
  VALUES
    (p_storage_path, p_public_url, p_alt, COALESCE(p_tags, '{}'), p_user_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_create_campaign_photo(uuid, text, text, text, text[])
  TO anon, authenticated;

-- 6. RPC update (alt, tags, is_active)
CREATE OR REPLACE FUNCTION public.dashboard_update_campaign_photo(
  p_user_id uuid,
  p_photo_id uuid,
  p_alt text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS public.dashboard_campaign_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.dashboard_campaign_photos;
BEGIN
  PERFORM public._dashboard_assert_admin(p_user_id);

  UPDATE public.dashboard_campaign_photos
  SET
    alt = COALESCE(p_alt, alt),
    tags = COALESCE(p_tags, tags),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_photo_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'photo not found';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_update_campaign_photo(uuid, uuid, text, text[], boolean)
  TO anon, authenticated;

-- 7. RPC delete (supprime metadata + objet Storage)
CREATE OR REPLACE FUNCTION public.dashboard_delete_campaign_photo(
  p_user_id uuid,
  p_photo_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_storage_path text;
BEGIN
  PERFORM public._dashboard_assert_admin(p_user_id);

  SELECT storage_path INTO v_storage_path
  FROM public.dashboard_campaign_photos
  WHERE id = p_photo_id;

  IF v_storage_path IS NULL THEN
    RAISE EXCEPTION 'photo not found';
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'campaign-photos'
    AND name = v_storage_path;

  DELETE FROM public.dashboard_campaign_photos
  WHERE id = p_photo_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_delete_campaign_photo(uuid, uuid)
  TO anon, authenticated;

-- 8. RPC random photo (utilisée par le workflow n8n)
CREATE OR REPLACE FUNCTION public.dashboard_random_campaign_photo(
  p_tags text[] DEFAULT NULL
)
RETURNS public.dashboard_campaign_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.dashboard_campaign_photos;
BEGIN
  SELECT * INTO v_row
  FROM public.dashboard_campaign_photos
  WHERE is_active = true
    AND (
      p_tags IS NULL
      OR array_length(p_tags, 1) IS NULL
      OR tags && p_tags
    )
  ORDER BY random()
  LIMIT 1;

  IF v_row.id IS NULL AND p_tags IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.dashboard_campaign_photos
    WHERE is_active = true
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'no campaign photo available';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_random_campaign_photo(text[])
  TO anon, authenticated;
