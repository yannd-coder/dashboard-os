-- V0.4 — machine runs + posts drafts pour M01 ARIA
-- n8n appelle les RPC en anon (SECURITY DEFINER) pour insérer runs + drafts.
-- Front lit en anon SELECT et décide via RPC.

-- ============================================================================
-- TABLE : dashboard_machine_runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_machine_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code    text NOT NULL,
  trigger_source  text NOT NULL CHECK (trigger_source IN ('manual', 'cron', 'webhook')),
  status          text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  summary         text,
  error           text,
  triggered_by    uuid REFERENCES public.dashboard_users(id),
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_machine_runs_code_started
  ON public.dashboard_machine_runs (machine_code, started_at DESC);

ALTER TABLE public.dashboard_machine_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "machine_runs anon read" ON public.dashboard_machine_runs;
CREATE POLICY "machine_runs anon read"
  ON public.dashboard_machine_runs FOR SELECT TO anon USING (true);

-- ============================================================================
-- TABLE : dashboard_posts_drafts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_posts_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_run_id  uuid REFERENCES public.dashboard_machine_runs(id) ON DELETE CASCADE,
  machine_code    text NOT NULL,
  network         text NOT NULL CHECK (network IN ('facebook', 'instagram')),
  account_handle  text NOT NULL,
  content         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  decided_at      timestamptz,
  decided_by      uuid REFERENCES public.dashboard_users(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_posts_drafts_code_status_created
  ON public.dashboard_posts_drafts (machine_code, status, created_at DESC);

ALTER TABLE public.dashboard_posts_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drafts anon read" ON public.dashboard_posts_drafts;
CREATE POLICY "drafts anon read"
  ON public.dashboard_posts_drafts FOR SELECT TO anon USING (true);

-- ============================================================================
-- RPC : create machine run (appelée par n8n au début du workflow)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_create_machine_run(
  p_machine_code text,
  p_trigger_source text,
  p_user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_machine_runs (machine_code, trigger_source, triggered_by)
  VALUES (p_machine_code, p_trigger_source, p_user_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : complete machine run (appelée par n8n à la fin)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_complete_machine_run(
  p_run_id uuid,
  p_status text,
  p_summary text DEFAULT NULL,
  p_error text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('success', 'error') THEN
    RAISE EXCEPTION 'Invalid status %, expected success or error', p_status;
  END IF;
  UPDATE public.dashboard_machine_runs
  SET status = p_status, summary = p_summary, error = p_error, ended_at = now()
  WHERE id = p_run_id;
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- RPC : add draft (appelée par n8n pour chaque post généré)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_add_draft(
  p_run_id uuid,
  p_machine_code text,
  p_network text,
  p_account_handle text,
  p_content text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_posts_drafts (machine_run_id, machine_code, network, account_handle, content)
  VALUES (p_run_id, p_machine_code, p_network, p_account_handle, p_content)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : decide draft (appelée depuis le front quand Yann approuve/rejette)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_decide_draft(
  p_draft_id uuid,
  p_decision text,
  p_user_id uuid,
  p_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision %, expected approved or rejected', p_decision;
  END IF;
  UPDATE public.dashboard_posts_drafts
  SET status = p_decision, decided_by = p_user_id, decided_at = now(), notes = p_notes
  WHERE id = p_draft_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- GRANTS pour anon (RPC SECURITY DEFINER, sécurité côté logique)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.dashboard_create_machine_run(text, text, uuid)        TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_complete_machine_run(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_add_draft(uuid, text, text, text, text)      TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_decide_draft(uuid, text, uuid, text)         TO anon;
