-- V0.8 étape 3 — Knowledge base simple
-- Table dashboard_knowledge_docs : un fichier = une ligne, contient le texte extrait
-- Bucket Storage knowledge-docs : les fichiers source eux-mêmes
-- Pas de pgvector / pas d'embeddings : ARIA lit les docs en entier via tools.

-- ============================================================================
-- TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dashboard_knowledge_docs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        text NOT NULL,
  storage_path    text NOT NULL,
  mime            text NOT NULL,
  size_bytes      bigint NOT NULL,
  extracted_text  text NOT NULL,
  summary         text,
  char_count      integer NOT NULL DEFAULT 0,
  uploaded_by     uuid REFERENCES public.dashboard_users(id) ON DELETE SET NULL,
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_knowledge_docs_uploaded_at
  ON public.dashboard_knowledge_docs (uploaded_at DESC);

ALTER TABLE public.dashboard_knowledge_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_docs anon read" ON public.dashboard_knowledge_docs;
CREATE POLICY "knowledge_docs anon read"
  ON public.dashboard_knowledge_docs FOR SELECT TO anon USING (true);

-- ============================================================================
-- RPC : create
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_create_knowledge_doc(
  p_filename       text,
  p_storage_path   text,
  p_mime           text,
  p_size_bytes     bigint,
  p_extracted_text text,
  p_summary        text,
  p_uploaded_by    uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.dashboard_knowledge_docs
    (filename, storage_path, mime, size_bytes, extracted_text, summary, char_count, uploaded_by)
  VALUES
    (p_filename, p_storage_path, p_mime, p_size_bytes, p_extracted_text, p_summary,
     COALESCE(char_length(p_extracted_text), 0), p_uploaded_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC : delete (admin/superadmin only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_delete_knowledge_doc(
  p_doc_id  uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_users
    WHERE id = p_user_id AND role IN ('superadmin', 'admin') AND is_approved = true
  ) THEN
    RAISE EXCEPTION 'forbidden: admin or superadmin role required';
  END IF;
  DELETE FROM public.dashboard_knowledge_docs WHERE id = p_doc_id;
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- RPC : get_text (lecture du extracted_text, utilisé par le tool ARIA)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_get_knowledge_doc_text(
  p_doc_id uuid
) RETURNS TABLE (
  id         uuid,
  filename   text,
  summary    text,
  char_count integer,
  extracted_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.filename, d.summary, d.char_count, d.extracted_text
  FROM public.dashboard_knowledge_docs d
  WHERE d.id = p_doc_id;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.dashboard_create_knowledge_doc(text, text, text, bigint, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_delete_knowledge_doc(uuid, uuid)                                 TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_get_knowledge_doc_text(uuid)                                     TO anon;

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-docs',
  'knowledge-docs',
  true,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'text/markdown',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES (cohérent avec le pattern campaign-photos : anon CRUD)
-- ============================================================================
DROP POLICY IF EXISTS "knowledge_docs anon read" ON storage.objects;
CREATE POLICY "knowledge_docs anon read"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'knowledge-docs');

DROP POLICY IF EXISTS "knowledge_docs anon insert" ON storage.objects;
CREATE POLICY "knowledge_docs anon insert"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'knowledge-docs');

DROP POLICY IF EXISTS "knowledge_docs anon delete" ON storage.objects;
CREATE POLICY "knowledge_docs anon delete"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'knowledge-docs');
