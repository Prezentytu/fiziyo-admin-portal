'use client';

import { useRef, useState } from 'react';
import { Loader2, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { EnrichmentStepImageV3 } from '@/graphql/types/exerciseEnrichment.types';
import { stepsForImage } from '../utils/stepMedia';
import { StageSection } from './StageSection';

export interface PendingPhoto {
  index: number;
  previewUrl: string;
}

interface MaterialStageProps {
  videoUrl: string;
  photos: string[];
  stepImages: EnrichmentStepImageV3[] | undefined;
  maxPhotos: number;
  pendingPhoto: PendingPhoto | null;
  generatingIndex: number | null;
  isGenerating: boolean;
  isSavingPhoto: boolean;
  onVideoUrlChange: (value: string) => void;
  onReplacePhoto: (index: number) => void;
  onDeletePhoto: (url: string) => void;
  onAddPhotos: (files: FileList) => void;
  onAcceptPending: () => void;
  onRetryPending: () => void;
  onDiscardPending: () => void;
}

function VideoCard({
  videoUrl,
  onVideoUrlChange,
}: Readonly<{ videoUrl: string; onVideoUrlChange: (value: string) => void }>) {
  const [isEditing, setIsEditing] = useState(false);
  const hasVideo = videoUrl.trim().length > 0;

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-card p-4 [--input:var(--grouped-secondary)]',
        hasVideo ? 'bg-grouped-tertiary' : 'bg-status-warning-muted'
      )}
      data-testid="verification-material-video"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Video className={cn('h-5 w-5 shrink-0', hasVideo ? 'text-label-secondary' : 'text-status-warning')} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-foreground">Nagranie</p>
          <p className="truncate text-[13px] text-label-secondary">
            {hasVideo
              ? videoUrl
              : 'Brak nagrania. Pacjent zobaczy tylko zdjęcia, więc muszą pokazywać każdą fazę ruchu.'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setIsEditing((previous) => !previous)}
          data-testid="verification-material-video-edit-btn"
        >
          {hasVideo ? 'Wymień nagranie' : 'Dodaj nagranie'}
        </Button>
      </div>
      {isEditing && (
        <Input
          autoFocus
          type="url"
          value={videoUrl}
          aria-label="Adres nagrania"
          placeholder="https://…"
          onChange={(event) => onVideoUrlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) setIsEditing(false);
          }}
          data-testid="verification-material-video-url-input"
        />
      )}
    </section>
  );
}

export function MaterialStage({
  videoUrl,
  photos,
  stepImages,
  maxPhotos,
  pendingPhoto,
  generatingIndex,
  isGenerating,
  isSavingPhoto,
  onVideoUrlChange,
  onReplacePhoto,
  onDeletePhoto,
  onAddPhotos,
  onAcceptPending,
  onRetryPending,
  onDiscardPending,
}: MaterialStageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = isGenerating || isSavingPhoto;

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-material">
      <VideoCard videoUrl={videoUrl} onVideoUrlChange={onVideoUrlChange} />

      <StageSection
        title="Zdjęcia"
        hint="Sprawdź każde zdjęcie z nagraniem: ustawienie stawów, dłonie, tło. Pod zdjęciem widać, który krok pokazuje."
        data-testid="verification-material-photos"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((url, index) => {
            const isPending = pendingPhoto?.index === index;
            const src = isPending ? pendingPhoto.previewUrl : getMediaUrl(url);
            const steps = stepsForImage(stepImages, url);
            return (
              <div
                key={url}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl bg-card p-2.5',
                  isPending && 'ring-[1.5px] ring-inset ring-tint'
                )}
                data-testid={`verification-material-photo-${index + 1}`}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-control bg-fill-tertiary">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element -- remote CDN or local preview data URL
                    <img src={src} alt={`Zdjęcie ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                  {isGenerating && generatingIndex === index && (
                    <span className="absolute inset-0 grid place-items-center bg-scrim">
                      <Loader2 className="h-6 w-6 animate-spin text-on-tint" />
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-foreground">
                    Zdjęcie {index + 1}
                    {isPending ? ' · nowe' : ''}
                  </span>
                  <span className="text-[12px] text-label-secondary">
                    {isPending
                      ? 'Nowe zdjęcie od agenta. Porównaj z nagraniem.'
                      : steps.length > 0
                        ? `Krok ${steps.join(', ')}`
                        : 'Nieprzypięte do kroku'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {isPending ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="tinted"
                        onClick={onAcceptPending}
                        disabled={isBusy}
                        data-testid={`verification-material-photo-${index + 1}-accept-btn`}
                      >
                        {isSavingPhoto && <Loader2 className="animate-spin" />}
                        Przyjmij
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onRetryPending}
                        disabled={isBusy}
                        data-testid={`verification-material-photo-${index + 1}-retry-btn`}
                      >
                        Jeszcze raz
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onDiscardPending}
                        disabled={isSavingPhoto}
                        data-testid={`verification-material-photo-${index + 1}-discard-btn`}
                      >
                        Zostaw stare
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onReplacePhoto(index)}
                        disabled={isBusy || pendingPhoto !== null}
                        data-testid={`verification-material-photo-${index + 1}-replace-btn`}
                      >
                        Wymień
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeletePhoto(url)}
                        disabled={isBusy || pendingPhoto !== null}
                        data-testid={`verification-material-photo-${index + 1}-delete-btn`}
                      >
                        Usuń
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {photos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="grid min-h-[200px] place-items-center rounded-2xl border-[1.5px] border-dashed border-separator text-[14px] font-semibold text-tint transition-colors hover:bg-tint-muted disabled:opacity-40"
              data-testid="verification-material-photo-add-btn"
            >
              + Dodaj zdjęcie
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) onAddPhotos(event.target.files);
            event.target.value = '';
          }}
          data-testid="verification-material-photo-file-input"
        />
      </StageSection>
    </div>
  );
}
