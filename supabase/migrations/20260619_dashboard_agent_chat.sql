-- V0.8 — Agent conversations & messages
-- Foundation chat : Yann discute avec un agent (ARIA, MAX, META, ...).
-- Persistance des conversations multi-session. Tools/RAG branchés plus tard.

-- ============================================================================
-- TABLE : dashboard_agent_conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_agent_conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code   text NOT NULL,
  user_id      uuid NOT NULL REFERENCES public.dashboard_users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Nouvelle conversation',
  archived     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_agent_conv_user_agent_updated
  ON public.dashboard_agent_conversations (user_id, agent_code, updated_at DESC)
  WHERE archived = false;

ALTER TABLE public.dashboard_agent_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_conv anon read" ON public.dashboard_agent_conversations;
CREATE POLICY "agent_conv anon read"
  ON public.dashboard_agent_conversations FOR SELECT TO anon USING (true);

-- ============================================================================
-- TABLE : dashboard_agent_messages
-- role : 'user'      = message Yann
--        'assistant' = réponse de l'agent (Claude)
--        'tool'      = résultat d'un tool call (V0.9, on prépare la colonne déjà)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_agent_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dashboard_agent_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content         text,
  tool_calls      jsonb,
  tool_results    jsonb,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_agent_msg_conv_created
  ON public.dashboard_agent_messages (conversation_id, created_at ASC);

ALTER TABLE public.dashboard_agent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_msg anon read" ON public.dashboard_agent_messages;
CREATE POLICY "agent_msg anon read"
  ON public.dashboard_agent_messages FOR SELECT TO anon USING (true);

-- ============================================================================
-- RPC : create_conversation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_create_agent_conversation(
  p_agent_code text,
  p_user_id    uuid,
  p_title      text DEFAULT 'Nouvelle conversation'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_agent_conversations (agent_code, user_id, title)
  VALUES (p_agent_code, p_user_id, COALESCE(p_title, 'Nouvelle conversation'))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : list_conversations (par user + filtre agent optionnel)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_list_agent_conversations(
  p_user_id    uuid,
  p_agent_code text DEFAULT NULL,
  p_limit      int DEFAULT 50
) RETURNS TABLE (
  id         uuid,
  agent_code text,
  title      text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.agent_code, c.title, c.created_at, c.updated_at
  FROM public.dashboard_agent_conversations c
  WHERE c.user_id = p_user_id
    AND c.archived = false
    AND (p_agent_code IS NULL OR c.agent_code = p_agent_code)
  ORDER BY c.updated_at DESC
  LIMIT GREATEST(p_limit, 1);
END;
$$;

-- ============================================================================
-- RPC : get_messages (ordre chrono ASC)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_get_agent_messages(
  p_conversation_id uuid
) RETURNS TABLE (
  id           uuid,
  role         text,
  content      text,
  tool_calls   jsonb,
  tool_results jsonb,
  metadata     jsonb,
  created_at   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.role, m.content, m.tool_calls, m.tool_results, m.metadata, m.created_at
  FROM public.dashboard_agent_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC, m.id ASC;
END;
$$;

-- ============================================================================
-- RPC : append_message (appelée par edge function chat-agent en SR)
-- Touche updated_at de la conversation au passage.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_append_agent_message(
  p_conversation_id uuid,
  p_role            text,
  p_content         text,
  p_tool_calls      jsonb DEFAULT NULL,
  p_tool_results    jsonb DEFAULT NULL,
  p_metadata        jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_role NOT IN ('user', 'assistant', 'tool') THEN
    RAISE EXCEPTION 'Invalid role %, expected user|assistant|tool', p_role;
  END IF;
  INSERT INTO public.dashboard_agent_messages
    (conversation_id, role, content, tool_calls, tool_results, metadata)
  VALUES
    (p_conversation_id, p_role, p_content, p_tool_calls, p_tool_results, p_metadata)
  RETURNING id INTO v_id;
  UPDATE public.dashboard_agent_conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : rename + archive conversation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_rename_agent_conversation(
  p_conversation_id uuid,
  p_title           text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dashboard_agent_conversations
  SET title = p_title, updated_at = now()
  WHERE id = p_conversation_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_archive_agent_conversation(
  p_conversation_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dashboard_agent_conversations
  SET archived = true, updated_at = now()
  WHERE id = p_conversation_id;
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- GRANTS pour anon
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.dashboard_create_agent_conversation(text, uuid, text)                     TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_list_agent_conversations(uuid, text, int)                       TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_get_agent_messages(uuid)                                        TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_append_agent_message(uuid, text, text, jsonb, jsonb, jsonb)     TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_rename_agent_conversation(uuid, text)                           TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_archive_agent_conversation(uuid)                                TO anon;
