-- V0.6 — Ajout du jsonb image_urls aux drafts M01
-- Structure : { "square": "https://...", "story": "https://...", "banner": "https://..." }
-- Appliquée le 2026-06-18 via MCP Supabase.

ALTER TABLE public.dashboard_posts_drafts
  ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT NULL;

COMMENT ON COLUMN public.dashboard_posts_drafts.image_urls
  IS 'URLs publiques des visuels générés par browserless. Clés: square (1080x1080), story (1080x1920), banner (1200x630).';
