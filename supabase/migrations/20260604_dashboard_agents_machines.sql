-- V0.3 — tables agents + machines (read-only via anon)
-- Sécurité : RLS on, anon SELECT uniquement. Mutations via SQL direct ou RPC future.

-- ============================================================================
-- TABLE : dashboard_agents
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_agents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  role         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'building'
               CHECK (status IN ('live', 'building', 'idle', 'error')),
  domain       text NOT NULL DEFAULT 'global'
               CHECK (domain IN ('coliver', 'seo', 'global')),
  channels     text[] NOT NULL DEFAULT '{}',
  gradient     text NOT NULL DEFAULT 'violet',
  icon         text NOT NULL DEFAULT 'Bot',
  runs         int  NOT NULL DEFAULT 0,
  success_rate int  NOT NULL DEFAULT 0,
  avg_time     text NOT NULL DEFAULT '—',
  last_run     timestamptz,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_agents anon read" ON public.dashboard_agents;
CREATE POLICY "dashboard_agents anon read"
  ON public.dashboard_agents
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- TABLE : dashboard_machines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_machines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  category      text NOT NULL,
  category_icon text NOT NULL DEFAULT '⚙️',
  status        text NOT NULL DEFAULT 'building'
                CHECK (status IN ('live', 'building', 'idle', 'error')),
  gradient      text NOT NULL DEFAULT 'violet',
  icon          text NOT NULL DEFAULT 'Wrench',
  last_run      timestamptz,
  sort_order    int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_machines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_machines anon read" ON public.dashboard_machines;
CREATE POLICY "dashboard_machines anon read"
  ON public.dashboard_machines
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- SEED : agents
-- ============================================================================
INSERT INTO public.dashboard_agents
  (code, name, role, status, domain, channels, gradient, icon, sort_order)
VALUES
  ('A01', 'ARIA', 'Créatrice de contenu', 'live',     'global',  ARRAY['Instagram','Facebook','TikTok'],   'pink',        'Sparkles', 1),
  ('A02', 'MAX',  'Gestionnaire Coliver', 'live',     'coliver', ARRAY['Email','WhatsApp'],                'violet-pink', 'Bot',      2),
  ('A03', 'LÉON', 'Stratège Contenu',     'live',     'global',  ARRAY['LinkedIn','Instagram'],            'violet',      'Brain',    3),
  ('A04', 'REX',  'Hunter SEO/Liens',     'building', 'seo',     ARRAY['Email','Ahrefs'],                  'orange',      'Search',   4),
  ('A05', 'NOVA', 'Analyste',             'live',     'global',  ARRAY['Analytics','Notion'],              'cyan',        'Zap',      5)
ON CONFLICT (code) DO UPDATE
  SET name      = EXCLUDED.name,
      role      = EXCLUDED.role,
      status    = EXCLUDED.status,
      domain    = EXCLUDED.domain,
      channels  = EXCLUDED.channels,
      gradient  = EXCLUDED.gradient,
      icon      = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- ============================================================================
-- SEED : machines
-- ============================================================================
INSERT INTO public.dashboard_machines
  (code, name, category, category_icon, status, gradient, icon, sort_order)
VALUES
  ('M01', 'Générateur Posts Facebook Coworking', 'CONTENU',   '🎨', 'building', 'pink',        'Image',         1),
  ('M02', 'Réponse prospects Coliver',           'COLIVER',   '🏝️', 'live',     'violet-pink', 'MessageSquare', 2),
  ('M03', 'Relance clients Coworking',           'COLIVER',   '🏝️', 'building', 'orange',      'Mail',          3),
  ('M04', 'NDD Scanner SEO',                     'LIENS SEO', '🔗', 'building', 'cyan',        'Search',        4)
ON CONFLICT (code) DO UPDATE
  SET name          = EXCLUDED.name,
      category      = EXCLUDED.category,
      category_icon = EXCLUDED.category_icon,
      status        = EXCLUDED.status,
      gradient      = EXCLUDED.gradient,
      icon          = EXCLUDED.icon,
      sort_order    = EXCLUDED.sort_order,
      updated_at    = now();
