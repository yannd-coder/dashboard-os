-- Réglages par machine (v09 Atelier 2) — pilotés depuis la page machine du dashboard
BEGIN;

CREATE TABLE IF NOT EXISTS public.dashboard_machine_settings (
  machine_code text PRIMARY KEY REFERENCES public.dashboard_machines(code) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.dashboard_machine_settings (machine_code, settings)
VALUES ('M01', '{"pairs_per_run": 1, "fontscale": 1, "theme_mode": "auto", "theme_fixed": "", "tone": "ami", "extra_instructions": ""}'::jsonb)
ON CONFLICT (machine_code) DO NOTHING;

ALTER TABLE public.dashboard_machine_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "machine_settings_anon_select" ON public.dashboard_machine_settings;
CREATE POLICY "machine_settings_anon_select" ON public.dashboard_machine_settings
  FOR SELECT TO anon USING (true);

CREATE OR REPLACE FUNCTION public.dashboard_update_machine_settings(
  p_machine_code text,
  p_settings jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dashboard_machine_settings (machine_code, settings, updated_at)
  VALUES (p_machine_code, p_settings, now())
  ON CONFLICT (machine_code) DO UPDATE
    SET settings = EXCLUDED.settings, updated_at = now();
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_update_machine_settings(text, jsonb) TO anon;

COMMIT;
