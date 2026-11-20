'use client';

import { useRef, useState } from 'react';
import { Loader2, Sparkles, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ExerciseVideosField } from '@/features/exercises/ExerciseVideosField';
import { cn } from '@/lib/utils';
import { normalizeVideoList } from '@/utils/exerciseVideos';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { EnrichmentStepImageV3 } from '@/graphql/types/exerciseEnrichment.types';
import { stepsForImage } from '../utils/stepMedia';
import type { VerificationFact } from '../utils/verificationFacts';
import { ContractFacts } from './ContractFacts';
import { StageSection } from './StageSection';

export interface PendingPhoto {
  index: number;
  previewUrl: string;
}

interface MaterialStageProps {
  /** Draft rows of the video list, main video first. */
  videos: string[];
  /** Video or GIF the photos can be compared with. */
  hasVideo: boolean;
  photos: string[];
  stepImages: EnrichmentStepImageV3[] | undefined;
  maxPhotos: number;
  pendingPhoto: PendingPhoto | null;
  generatingIndex: number | null;
  isGenerating: boolean;
  isSavingPhoto: boolean;
  onVideosChange: (value: string[]) => void;
  onPreviewPhoto: (url: string) => void;
  onReplacePhoto: (index: number) => void;
  onDeletePhoto: (url: string) => void;
  onAddPhotos: (files: FileList) => void;
  onGeneratePhoto: () => void;
  onAcceptPending: () => void;
  onRetryPending: () => void;
  onDiscardPending: () => void;
  /** Contract v3.3: media facts of the document, read-only. */
  contractFacts?: VerificationFact[];
}

function VideoCard({
  videos,
  onVideosChange,
}: Readonly<{ videos: string[]; onVideosChange: (value: string[]) => void }>) {
  const [isEditing, setIsEditing] = useState(false);
  const savedVideos = normalizeVideoList(videos);
  const hasVideo = savedVideos.length > 0;

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
          <p className="text-[17px] font-semibold text-foreground">
            {savedVideos.length > 1 ? `Nagrania (${savedVideos.length})` : 'Nagranie'}
          </p>
          {hasVideo ? (
            <ul className="text-[13px] text-label-secondary" data-testid="verification-material-video-list">
              {savedVideos.map((video) => (
                <li key={video} className="truncate">
                  {video}
                </li>
              ))}
            </ul>
          ) : (
            <p className="truncate text-[13px] text-label-secondary">
              Brak nagrania. Pacjent zobaczy tylko zdjęcia, więc muszą pokazywać każdą fazę ruchu.
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={isEditing}
          onClick={() => setIsEditing((previous) => !previous)}
          data-testid="verification-material-video-edit-btn"
        >
          {isEditing ? 'Gotowe' : hasVideo ? 'Zmień nagrania' : 'Dodaj nagranie'}
        </Button>
      </div>
      {isEditing && (
        <ExerciseVideosField
          autoFocus
          value={videos}
          dirty={false}
          disabled={false}
          onChange={onVideosChange}
          inputId="verification-material-video-url"
          testId="verification-material-video-url-input"
        />
      )}
    </section>
  );
}

export function MaterialStage({
  videos,
  hasVideo,
  photos,
  stepImages,
  maxPhotos,
  pendingPhoto,
  generatingIndex,
  isGenerating,
  isSavingPhoto,
  onVideosChange,
  onPreviewPhoto,
  onReplacePhoto,
  onDeletePhoto,
  onAddPhotos,
  onGeneratePhoto,
  onAcceptPending,
  onRetryPending,
  onDiscardPending,
  contractFacts,
}: MaterialStageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = isGenerating || isSavingPhoto;
  const isPendingNew = pendingPhoto !== null && pendingPhoto.index >= photos.length;
  const tiles = isPendingNew ? [...photos, ''] : photos;
  const canAddPhoto = !isPendingNew && photos.length < maxPhotos;
  const isGeneratingNew = isGenerating && generatingIndex === photos.length;

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-material">
      <VideoCard videos={videos} onVideosChange={onVideosChange} />

      <StageSection
        title="Zdjęcia"
        hint={`${hasVideo ? 'Porównaj z nagraniem' : 'Sprawdź'}: ustawienie stawów, dłonie, tło.`}
        className="@container"
        data-testid="verification-material-photos"
      >
        <div className="grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4">
          {tiles.map((url, index) => {
            const isPending = pendingPhoto?.index === index;
            const src = isPending ? pendingPhoto.previewUrl : getMediaUrl(url);
            const steps = stepsForImage(stepImages, url);
            return (
              <div
                key={url || 'pending-new'}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl bg-card p-2.5',
                  isPending && 'ring-[1.5px] ring-inset ring-tint'
                )}
                data-testid={`verification-material-photo-${index + 1}`}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-control bg-fill-tertiary">
                  {src && (
                    <button
                      type="button"
                      onClick={() => onPreviewPhoto(url)}
                      disabled={isPending}
                      aria-label={`Pokaż duże zdjęcie ${index + 1}`}
                      className="block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tint disabled:cursor-default"
                      data-testid={`verification-material-photo-${index + 1}-preview-btn`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN or local preview data URL */}
                      <img src={src} alt={`Zdjęcie ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
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
                  {(isPending || steps.length > 0) && (
                    <span className="text-[12px] text-label-secondary">
                      {isPending
                        ? `Od agenta. Porównaj ${hasVideo ? 'z nagraniem' : 'z pozostałymi'}.`
                        : `Krok ${steps.join(', ')}`}
                    </span>
                  )}
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
                        {isPendingNew ? 'Odrzuć' : 'Zostaw stare'}
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
          {canAddPhoto && (
            <div className="grid min-h-[200px] grid-rows-2 gap-2">
              <button
                type="button"
                onClick={onGeneratePhoto}
                disabled={isBusy || pendingPhoto !== null}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-tint-muted text-[14px] font-semibold text-tint transition-colors hover:bg-tint-muted/70 disabled:opacity-40"
                data-testid="verification-material-photo-generate-btn"
              >
                {isGeneratingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGeneratingNew ? 'Generuję…' : 'Wygeneruj zdjęcie'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="grid place-items-center rounded-2xl border-[1.5px] border-dashed border-separator text-[14px] font-semibold text-tint transition-colors hover:bg-tint-muted disabled:opacity-40"
                data-testid="verification-material-photo-add-btn"
              >
                Wgraj z dysku
              </button>
            </div>
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
      {contractFacts && (
        <ContractFacts
          title="Media w treści ćwiczenia"
          facts={contractFacts}
          hint="Tylko do odczytu. Wymiana zdjęcia tutaj nie zmienia tej listy; przychodzi z importu paczki treści."
          data-testid="verification-material-facts"
        />
      )}
    </div>
  );
}
