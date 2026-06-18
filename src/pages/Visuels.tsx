import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Loader2, Pencil, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  rpcDeleteCampaignPhoto,
  rpcUpdateCampaignPhoto,
  uploadCampaignPhoto,
} from '@/lib/api';
import { useCampaignPhotos } from '@/hooks/useCampaignPhotos';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { CampaignPhoto } from '@/types';

const SUGGESTED_TAGS = [
  'piscine',
  'jardin',
  'terrasse',
  'extérieur',
  'intérieur',
  'salon',
  'chambre',
  'cuisine',
  'bureau',
  'matin',
  'soir',
  'lifestyle',
];

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.82;

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, MAX_WIDTH / img.naturalWidth);
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas 2d context unavailable'));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('blob conversion failed')),
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image load failed'));
    };
    img.src = objectUrl;
  });
}

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]/g, '');
}

export function Visuels() {
  const { user } = useAuth();
  const { photos, loading, error: loadError, refetch } = useCampaignPhotos();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<CampaignPhoto | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    if (!user) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) {
      setError('Aucun fichier image valide.');
      return;
    }
    setError(null);
    setUploading({ done: 0, total: arr.length });
    for (const file of arr) {
      try {
        const blob = await compressImage(file);
        const altGuess = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        await uploadCampaignPhoto(user.id, blob, altGuess, []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload échoué');
      } finally {
        setUploading((prev) =>
          prev ? { ...prev, done: prev.done + 1 } : prev,
        );
      }
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await refetch();
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const onDelete = async (photo: CampaignPhoto) => {
    if (!user) return;
    if (!confirm(`Supprimer "${photo.alt ?? photo.storagePath}" ?`)) return;
    try {
      await rpcDeleteCampaignPhoto(user.id, photo.id);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression échouée');
    }
  };

  const activeCount = photos.filter((p) => p.isActive).length;
  const subtitle = loading
    ? 'Chargement…'
    : `${photos.length} photo${photos.length > 1 ? 's' : ''} · ${activeCount} active${activeCount > 1 ? 's' : ''}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bibliothèque visuelle"
        subtitle={subtitle}
        actions={
          <Button
            variant="primary"
            icon={<Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading !== null}
          >
            Upload
          </Button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPickFiles}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDraggingOver(true);
        }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          'cursor-pointer rounded-2xl border-2 border-dashed border-border-subtle bg-bg-surface/50 px-6 py-10 text-center transition-colors',
          draggingOver && 'border-accent-violet bg-accent-violet/10',
          uploading && 'pointer-events-none opacity-50',
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-sm text-text-secondary">
            <Loader2 size={20} className="animate-spin" />
            <span>
              Upload en cours… {uploading.done}/{uploading.total}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-text-secondary">
            <Upload size={20} />
            <span>Glisse tes photos ici ou clique pour parcourir</span>
            <span className="text-xs text-text-tertiary">
              JPEG / PNG / WebP · compressées auto à 1920px · jusqu'à 5 MB par fichier
            </span>
          </div>
        )}
      </div>

      {(error || loadError) && (
        <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-xs text-accent-red">
          {error || loadError}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-12 text-center text-text-tertiary">
          Chargement…
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-12 text-center text-text-tertiary">
          Bibliothèque vide. Upload tes premières photos pour démarrer.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onEdit={() => setEditingPhoto(photo)}
              onDelete={() => onDelete(photo)}
            />
          ))}
        </div>
      )}

      {editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSaved={async () => {
            setEditingPhoto(null);
            await refetch();
          }}
        />
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  onEdit,
  onDelete,
}: {
  photo: CampaignPhoto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border-subtle bg-bg-surface',
        !photo.isActive && 'opacity-60',
      )}
    >
      <div className="aspect-square w-full overflow-hidden bg-bg-base">
        <img
          src={photo.publicUrl}
          alt={photo.alt ?? ''}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {photo.tags.length > 0 && (
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
          {photo.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
            >
              {t}
            </span>
          ))}
          {photo.tags.length > 3 && (
            <span className="rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
              +{photo.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {!photo.isActive && (
        <span className="absolute right-2 top-2 rounded-full bg-bg-base/85 px-2 py-0.5 text-[10px] text-text-tertiary">
          masquée
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="line-clamp-2 flex-1 text-xs text-white/90">
          {photo.alt || '—'}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md bg-white/10 p-1.5 text-white hover:bg-white/25"
            aria-label="Éditer"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md bg-white/10 p-1.5 text-white hover:bg-accent-red/60"
            aria-label="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPhotoModal({
  photo,
  onClose,
  onSaved,
}: {
  photo: CampaignPhoto;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const [alt, setAlt] = useState(photo.alt ?? '');
  const [tags, setTags] = useState<string[]>(photo.tags);
  const [tagInput, setTagInput] = useState('');
  const [isActive, setIsActive] = useState(photo.isActive);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addTag = (raw: string) => {
    const clean = normalizeTag(raw);
    if (!clean || tags.includes(clean)) return;
    setTags([...tags, clean]);
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setErr(null);
    try {
      await rpcUpdateCampaignPhoto(user.id, photo.id, {
        alt: alt.trim() || null,
        tags,
        isActive,
      });
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const availableSuggestions = SUGGESTED_TAGS.filter((t) => !tags.includes(t));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="text-sm font-semibold text-text-primary">Éditer la photo</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-surface2 hover:text-text-primary disabled:opacity-50"
            disabled={saving}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="aspect-video overflow-hidden rounded-lg bg-bg-base">
            <img src={photo.publicUrl} alt="" className="h-full w-full object-cover" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Description (alt)
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Vue piscine au coucher du soleil…"
              className="h-9 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-3 text-sm text-text-primary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Tags (optionnel)
            </label>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-violet-soft px-2.5 py-1 text-xs text-accent-violet"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="-mr-1 text-accent-violet/70 hover:text-accent-violet"
                      aria-label={`Retirer ${t}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput('');
                } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
                  setTags(tags.slice(0, -1));
                }
              }}
              placeholder="Tape un tag puis Entrée…"
              className="h-9 w-full rounded-lg border border-border-subtle bg-bg-surface2 px-3 text-sm text-text-primary focus:border-border-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            />
            {availableSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {availableSuggestions.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => addTag(t)}
                    className="rounded-full border border-border-subtle bg-bg-surface2 px-2 py-0.5 text-[11px] text-text-tertiary hover:border-accent-violet hover:text-accent-violet"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border-subtle bg-bg-surface2"
            />
            Active (utilisée par les campagnes M01)
          </label>

          {err && (
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
