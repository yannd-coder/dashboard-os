import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertTriangle,
  FileText,
  Loader2,
  Trash2,
  Upload,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { rpcDeleteKnowledgeDoc, uploadKnowledgeDoc } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useKnowledgeDocs } from '@/hooks/useKnowledgeDocs';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { KnowledgeDoc } from '@/types';

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'text/markdown',
  'text/plain',
]);
const ACCEPTED_EXTENSIONS = ['.pdf', '.md', '.txt'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

type UploadingState = {
  filename: string;
  stage: 'upload' | 'extract' | 'summarize';
} | null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCharCount(n: number): string {
  if (n < 1000) return `${n} car.`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K car.`;
  return `${(n / 1_000_000).toFixed(2)}M car.`;
}

function isAcceptable(file: File): boolean {
  if (file.size > MAX_SIZE_BYTES) return false;
  if (ACCEPTED_MIMES.has(file.type)) return true;
  return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

const STAGE_LABELS: Record<NonNullable<UploadingState>['stage'], string> = {
  upload: 'Upload du fichier…',
  extract: 'Extraction du texte…',
  summarize: 'Résumé par Claude…',
};

export function Knowledge() {
  const { user } = useAuth();
  const { docs, loading, error: fetchErr, refetch } = useKnowledgeDocs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    if (!user) return;
    const arr = Array.from(files);
    const accepted = arr.filter(isAcceptable);
    const rejected = arr.filter((f) => !isAcceptable(f));
    if (rejected.length > 0) {
      setError(
        `${rejected.length} fichier(s) ignoré(s) (formats PDF/MD/TXT acceptés, 10 MB max).`,
      );
    }
    for (const file of accepted) {
      setUploading({ filename: file.name, stage: 'upload' });
      try {
        // L'API uploadKnowledgeDoc fait : upload Storage → ingest-knowledge edge function (extract + summary + insert)
        // On simule les stages côté UI puisque l'edge function n'est pas en streaming
        setTimeout(() => setUploading((u) => (u ? { ...u, stage: 'extract' } : u)), 800);
        setTimeout(() => setUploading((u) => (u ? { ...u, stage: 'summarize' } : u)), 2500);
        const result = await uploadKnowledgeDoc(user.id, file);
        console.log('[knowledge] uploaded', file.name, result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload échoué');
      }
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await refetch();
  }

  function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDraggingOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  async function onDelete(doc: KnowledgeDoc) {
    if (!user) return;
    if (!confirm(`Supprimer "${doc.filename}" de la base de connaissance ?`)) return;
    setDeleting(doc.id);
    try {
      await rpcDeleteKnowledgeDoc(user.id, doc.id, doc.storagePath);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression échouée');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Base de connaissance"
        subtitle={`${docs.length} document${docs.length === 1 ? '' : 's'} indexé${docs.length === 1 ? '' : 's'} — accessibles par ARIA via ses outils \`list_knowledge_docs\` et \`read_knowledge_doc\`.`}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDraggingOver(true);
        }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={onDrop}
        className={cn(
          'mb-6 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
          draggingOver
            ? 'border-accent-violet bg-accent-violet-soft'
            : 'border-border-subtle bg-bg-surface/40 hover:border-border-strong',
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-violet-soft text-accent-violet">
          <Upload size={20} />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">
            Glisse ton fichier ici, ou{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-accent-violet underline hover:no-underline"
            >
              clique pour parcourir
            </button>
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            PDF, Markdown (.md), texte (.txt) — 10 MB max
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain"
          multiple
          onChange={onPickFiles}
          className="hidden"
        />
        {uploading && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-xs text-text-secondary">
            <Loader2 size={14} className="animate-spin text-accent-violet" />
            <span>
              <strong className="text-text-primary">{uploading.filename}</strong> —{' '}
              {STAGE_LABELS[uploading.stage]}
            </span>
          </div>
        )}
      </div>

      {(error || fetchErr) && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent-pink/40 bg-accent-pink/10 p-3 text-sm text-accent-pink">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error ?? fetchErr?.message}</span>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-text-tertiary">Chargement…</div>
      ) : docs.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <BookOpen size={28} className="text-text-tertiary" />
          <p className="text-sm text-text-secondary">
            Aucun document pour l'instant. Drag-drop un PDF, .md ou .txt ci-dessus pour démarrer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {docs.map((d) => (
            <div
              key={d.id}
              className="card group flex items-start gap-4 p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-surface2 text-text-secondary">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-text-primary" title={d.filename}>
                    {d.filename}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onDelete(d)}
                    disabled={deleting === d.id}
                    className="rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-bg-surface2 hover:text-accent-pink group-hover:opacity-100"
                    title="Supprimer"
                  >
                    {deleting === d.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
                {d.summary && (
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary line-clamp-2">
                    {d.summary}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-tertiary">
                  <span>{formatBytes(d.sizeBytes)}</span>
                  <span>·</span>
                  <span>{formatCharCount(d.charCount)}</span>
                  <span>·</span>
                  <span>Ajouté {formatRelativeTime(d.uploadedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
