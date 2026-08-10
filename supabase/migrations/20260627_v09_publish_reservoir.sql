-- V0.9 — Réservoir de publications + 2 machines distinctes (Coworking / Coliving)
-- =============================================================================
-- 1. M01 renommée + M06 créée
-- 2. Table dashboard_publish_targets (4 lignes : platform × brand)
-- 3. Table dashboard_publish_schedule (rythme/heure par target)
-- 4. Colonnes target_id / scheduled_for / published_at / publish_error sur drafts
-- 5. Backfill target_id pour les drafts existants
-- 6. RPCs : update_publish_schedule, pick_next_to_publish, mark_published, mark_publish_failed

BEGIN;

-- 1. Machines
UPDATE public.dashboard_machines
SET name = 'Posts Coliver Coworking',
    description = 'Génère + planifie les posts FB/IG du Coworking',
    status = 'live',
    updated_at = now()
WHERE code = 'M01';

INSERT INTO public.dashboard_machines (code, name, description, category, category_icon, status, gradient, icon, sort_order)
VALUES ('M06', 'Posts Coliver Coliving', 'Génère + planifie les posts FB/IG du Coliving', 'CONTENU', '🎨', 'live', 'teal', 'Image', 6)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();

-- 2. Targets de publication (4 lignes)
CREATE TABLE IF NOT EXISTS public.dashboard_publish_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code text NOT NULL REFERENCES public.dashboard_machines(code) ON DELETE RESTRICT,
  platform text NOT NULL CHECK (platform IN ('facebook','instagram')),
  brand text NOT NULL CHECK (brand IN ('coworking','coliving')),
  display_name text NOT NULL,
  handle text,
  page_id text,
  ig_business_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, brand)
);

INSERT INTO public.dashboard_publish_targets (machine_code, platform, brand, display_name, handle, page_id)
VALUES
  -- page_id volontairement NULL : sera rempli par meta-token-bootstrap depuis /me/accounts
  -- handle = ID de page humain-lisible, à reconfirmer côté Meta au moment du token
  ('M01', 'facebook',  'coworking', 'FB Coworking', '1224780770710376', NULL),
  ('M01', 'instagram', 'coworking', 'IG Coworking', '@coworkingtropical_coliver', NULL),
  ('M06', 'facebook',  'coliving',  'FB Coliving',  'coliver974', NULL),
  ('M06', 'instagram', 'coliving',  'IG Coliving',  '@villacoliver_colivingtropical', NULL)
ON CONFLICT (platform, brand) DO NOTHING;

-- 3. Schedule par target (cadence + heure)
CREATE TABLE IF NOT EXISTS public.dashboard_publish_schedule (
  target_id uuid PRIMARY KEY REFERENCES public.dashboard_publish_targets(id) ON DELETE CASCADE,
  posts_per_week int NOT NULL DEFAULT 3 CHECK (posts_per_week BETWEEN 0 AND 21),
  publish_hour int NOT NULL DEFAULT 9 CHECK (publish_hour BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'Indian/Reunion',
  min_interval_hours int NOT NULL DEFAULT 24,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.dashboard_publish_schedule (target_id, posts_per_week, publish_hour, timezone)
SELECT id, 3, 9, 'Indian/Reunion'
FROM public.dashboard_publish_targets
ON CONFLICT (target_id) DO NOTHING;

-- 4. Colonnes drafts
ALTER TABLE public.dashboard_posts_drafts
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.dashboard_publish_targets(id),
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_post_id text,
  ADD COLUMN IF NOT EXISTS publish_error text,
  ADD COLUMN IF NOT EXISTS publish_attempts int NOT NULL DEFAULT 0;

-- Statut 'failed' en plus
ALTER TABLE public.dashboard_posts_drafts
  DROP CONSTRAINT IF EXISTS dashboard_posts_drafts_status_check;
ALTER TABLE public.dashboard_posts_drafts
  ADD CONSTRAINT dashboard_posts_drafts_status_check
  CHECK (status IN ('pending','approved','published','rejected','failed'));

-- 5. Backfill target_id sur les drafts existants (tous machine_code=M01 → cwk)
UPDATE public.dashboard_posts_drafts d
SET target_id = t.id
FROM public.dashboard_publish_targets t
WHERE d.target_id IS NULL
  AND d.machine_code = t.machine_code
  AND d.network = t.platform;

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_drafts_target_status ON public.dashboard_posts_drafts (target_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled ON public.dashboard_posts_drafts (scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_publish_targets_machine ON public.dashboard_publish_targets (machine_code);

-- 7. RLS
ALTER TABLE public.dashboard_publish_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "publish_targets_anon_select" ON public.dashboard_publish_targets;
CREATE POLICY "publish_targets_anon_select" ON public.dashboard_publish_targets
  FOR SELECT TO anon USING (true);

ALTER TABLE public.dashboard_publish_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "publish_schedule_anon_select" ON public.dashboard_publish_schedule;
CREATE POLICY "publish_schedule_anon_select" ON public.dashboard_publish_schedule
  FOR SELECT TO anon USING (true);

-- 8. RPC: update schedule (utilisée depuis page /publications)
CREATE OR REPLACE FUNCTION public.dashboard_update_publish_schedule(
  p_target_id uuid,
  p_posts_per_week int,
  p_publish_hour int,
  p_min_interval_hours int DEFAULT 24
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.dashboard_publish_schedule
  SET posts_per_week = p_posts_per_week,
      publish_hour = p_publish_hour,
      min_interval_hours = p_min_interval_hours,
      updated_at = now()
  WHERE target_id = p_target_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_update_publish_schedule(uuid, int, int, int) TO anon;

-- 9. RPC: pick next draft à publier pour une target (worker)
CREATE OR REPLACE FUNCTION public.dashboard_pick_next_to_publish(
  p_target_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_draft_id uuid;
BEGIN
  SELECT id INTO v_draft_id
  FROM public.dashboard_posts_drafts
  WHERE target_id = p_target_id
    AND status = 'approved'
    AND (scheduled_for IS NULL OR scheduled_for <= now())
  ORDER BY decided_at ASC NULLS LAST, created_at ASC
  LIMIT 1;
  RETURN v_draft_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_pick_next_to_publish(uuid) TO anon;

-- 10. RPC: mark published
CREATE OR REPLACE FUNCTION public.dashboard_mark_published(
  p_draft_id uuid,
  p_post_id text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.dashboard_posts_drafts
  SET status = 'published',
      published_at = now(),
      published_post_id = p_post_id,
      publish_error = NULL
  WHERE id = p_draft_id AND status = 'approved';
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_mark_published(uuid, text) TO anon;

-- 11. RPC: mark publish failed (3 tentatives max avant statut 'failed')
CREATE OR REPLACE FUNCTION public.dashboard_mark_publish_failed(
  p_draft_id uuid,
  p_error text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_attempts int;
BEGIN
  SELECT publish_attempts INTO v_attempts FROM public.dashboard_posts_drafts WHERE id = p_draft_id;
  UPDATE public.dashboard_posts_drafts
  SET publish_attempts = v_attempts + 1,
      publish_error = p_error,
      status = CASE WHEN v_attempts + 1 >= 3 THEN 'failed' ELSE 'approved' END
  WHERE id = p_draft_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_mark_publish_failed(uuid, text) TO anon;

COMMIT;
