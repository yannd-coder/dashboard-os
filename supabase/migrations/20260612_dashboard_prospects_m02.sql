-- V0.5 — M02 Réponse prospects : emails entrants + drafts de réponse
-- n8n lit la boîte contact@coliver.re, classifie via Claude, interroge Lodgify,
-- puis insère prospect + draft de réponse via RPC anon (SECURITY DEFINER).
-- Front lit en anon SELECT et décide via RPC (même pattern que M01).

-- ============================================================================
-- TABLE : dashboard_prospects (un email/demande entrante)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_prospects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_run_id  uuid REFERENCES public.dashboard_machine_runs(id) ON DELETE SET NULL,
  machine_code    text NOT NULL DEFAULT 'M02',
  source          text NOT NULL DEFAULT 'email'
                  CHECK (source IN ('email', 'lodgify', 'form', 'whatsapp', 'phone', 'other')),
  message_id      text UNIQUE,               -- Message-ID IMAP pour dédup
  email_from      text,
  subject         text,
  body            text NOT NULL,
  request_summary text,                      -- extraction Claude : dates, nb personnes, type demande
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'ignored')),
  received_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_prospects_code_created
  ON public.dashboard_prospects (machine_code, created_at DESC);

ALTER TABLE public.dashboard_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospects anon read" ON public.dashboard_prospects;
CREATE POLICY "prospects anon read"
  ON public.dashboard_prospects FOR SELECT TO anon USING (true);

-- ============================================================================
-- TABLE : dashboard_response_drafts (réponse proposée par Claude, à approuver)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_response_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id     uuid NOT NULL REFERENCES public.dashboard_prospects(id) ON DELETE CASCADE,
  machine_code    text NOT NULL DEFAULT 'M02',
  content         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'sent')),
  decided_at      timestamptz,
  decided_by      uuid REFERENCES public.dashboard_users(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_response_drafts_code_status_created
  ON public.dashboard_response_drafts (machine_code, status, created_at DESC);

ALTER TABLE public.dashboard_response_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "response_drafts anon read" ON public.dashboard_response_drafts;
CREATE POLICY "response_drafts anon read"
  ON public.dashboard_response_drafts FOR SELECT TO anon USING (true);

-- ============================================================================
-- RPC : add prospect (n8n — idempotent sur message_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_add_prospect(
  p_run_id uuid,
  p_source text,
  p_email_from text,
  p_subject text,
  p_body text,
  p_received_at timestamptz DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_message_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.dashboard_prospects WHERE message_id = p_message_id;
    IF v_id IS NOT NULL THEN
      RETURN v_id; -- déjà traité, pas de doublon
    END IF;
  END IF;

  INSERT INTO public.dashboard_prospects
    (machine_run_id, source, email_from, subject, body, received_at, request_summary, message_id)
  VALUES
    (p_run_id, p_source, p_email_from, p_subject, p_body, p_received_at, p_summary, p_message_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : add response draft (n8n — la réponse rédigée par Claude)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_add_response_draft(
  p_prospect_id uuid,
  p_content text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_response_drafts (prospect_id, content)
  VALUES (p_prospect_id, p_content)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : decide response draft (front — approve/reject par Yann)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_decide_response_draft(
  p_draft_id uuid,
  p_decision text,
  p_user_id uuid,
  p_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_prospect_id uuid;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision %, expected approved or rejected', p_decision;
  END IF;

  UPDATE public.dashboard_response_drafts
  SET status = p_decision, decided_by = p_user_id, decided_at = now(), notes = p_notes
  WHERE id = p_draft_id AND status = 'pending'
  RETURNING prospect_id INTO v_prospect_id;

  IF v_prospect_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.dashboard_prospects SET status = 'replied' WHERE id = v_prospect_id;
  END IF;
  RETURN true;
END;
$$;

-- ============================================================================
-- GRANTS pour anon (RPC SECURITY DEFINER, sécurité côté logique)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.dashboard_add_prospect(uuid, text, text, text, text, timestamptz, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_add_response_draft(uuid, text)                                      TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_decide_response_draft(uuid, text, uuid, text)                       TO anon;
