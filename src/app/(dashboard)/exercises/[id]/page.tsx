'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Clock,
  Repeat,
  Dumbbell,
  Play,
  FolderPlus,
  ArrowLeftRight,
  FileText,
  MoreHorizontal,
  Timer,
  ZoomIn,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseDialog } from '@/components/exercises/ExerciseDialog';
import { AddExerciseToSetsDialog } from '@/components/exercises/AddExerciseToSetsDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getMediaUrls } from '@/utils/mediaUrl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { DELETE_EXERCISE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { createTagsMap, mapExerciseTagsToObjects } from '@/utils/tagUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useExerciseBuilder } from '@/contexts/ExerciseBuilderContext';
import type {
  ExerciseByIdResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from '@/types/apollo';

interface ExerciseDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ExerciseTag {
  id: string;
  name: string;
  color: string;
}

function isTagObject(tag: string | ExerciseTag): tag is ExerciseTag {
  return typeof tag === 'object' && 'name' in tag;
}

export default function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { setIsChatOpen } = useExerciseBuilder();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddToSetDialogOpen, setIsAddToSetDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get exercise details
  const { data, loading, error } = useQuery(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
  });

  // Get tags for mapping
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get tag categories for color resolution
  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Delete mutation
  const [deleteExercise, { loading: deleting }] = useMutation(DELETE_EXERCISE_MUTATION, {
    refetchQueries: organizationId
      ? [
          {
            query: GET_ORGANIZATION_EXERCISES_QUERY,
            variables: { organizationId },
          },
        ]
      : [],
  });

  const rawExercise = (data as ExerciseByIdResponse)?.exerciseById;
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = createTagsMap(tags, categories);
  const exercise = rawExercise ? mapExerciseTagsToObjects(rawExercise, tagsMap) : null;

  const handleDelete = async () => {
    try {
      await deleteExercise({
        variables: { exerciseId: id },
      });
      toast.success('Ćwiczenie zostało usunięte');
      router.push('/exercises');
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      toast.error('Nie udało się usunąć ćwiczenia');
    }
  };

  const handleAddToSet = () => {
    setIsAddToSetDialogOpen(true);
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'reps':
        return 'Powtórzenia';
      case 'time':
        return 'Czasowe';
      default:
        return type || 'Inne';
    }
  };

  const getSideLabel = (side?: string) => {
    switch (side) {
      case 'left':
        return 'Lewa strona';
      case 'right':
        return 'Prawa strona';
      case 'both':
        return 'Obie strony';
      case 'alternating':
        return 'Naprzemiennie';
      default:
        return 'Bez podziału';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-2">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-destructive">{error ? `Błąd: ${error.message}` : 'Nie znaleziono ćwiczenia'}</p>
        <Button variant="outline" onClick={() => router.push('/exercises')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const allImages = getMediaUrls([exercise.imageUrl, ...(exercise.images || [])]);
  const currentImage = allImages[selectedImageIndex] || null;

  const hasTags = (exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0;

  return (
    <div className="flex h-[calc(100vh-(--spacing(16)))] flex-col lg:flex-row overflow-hidden -m-6 bg-zinc-950">
      {/* Left Column: Media Hero (The Immersive Cinema) - 35% width */}
      <div className="relative w-full lg:w-[35%] bg-black flex flex-col items-center justify-center overflow-hidden border-b lg:border-b-0 border-white/5">
        {/* Background Layer: Immersive Backdrop */}
        {currentImage && (
          <>
            <img 
              src={currentImage} 
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-80 scale-150 pointer-events-none"
            />
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          </>
        )}
        
        {/* Main content area (Content Layer) - No boxes, no limits */}
        <div className="relative z-10 w-full h-full flex items-center justify-center group/hero">
          {currentImage ? (
            <>
              <img
                src={currentImage}
                alt={exercise.name}
                className="relative w-full h-full object-contain z-10 p-4"
              />
              {/* Zoom button */}
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className={cn(
                  "absolute top-8 right-8 z-20",
                  "flex h-14 w-14 items-center justify-center rounded-full",
                  "bg-black/40 text-white/80 backdrop-blur-xl border border-white/10",
                  "opacity-0 group-hover/hero:opacity-100 transition-all duration-500",
                  "hover:bg-black/60 hover:text-white hover:scale-110"
                )}
                aria-label="Powiększ zdjęcie"
              >
                <ZoomIn className="h-7 w-7" />
              </button>
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImagePlaceholder type="exercise" className="h-32 w-32 opacity-10" iconClassName="h-24 w-24" />
            </div>
          )}

          {/* Thumbnails Overlay - Bottom left of the image column */}
          {(allImages.length > 1 || exercise.videoUrl) && (
            <div className="absolute bottom-8 left-8 z-20 flex gap-3 p-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 overflow-x-auto max-w-[calc(100%-4rem)] no-scrollbar opacity-0 group-hover/hero:opacity-100 transition-all duration-500">
              {allImages.map((img) => (
                <button
                  key={img}
                  onClick={() => setSelectedImageIndex(allImages.indexOf(img))}
                  className={cn(
                    'shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all duration-500',
                    currentImage === img
                      ? 'border-primary shadow-lg shadow-primary/20 scale-105'
                      : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                  )}
                >
                  <img src={img} alt={exercise.name} className="w-full h-full object-cover" />
                </button>
              ))}
              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-transparent bg-white/10 flex items-center justify-center hover:bg-white/20 hover:border-white/30 transition-all group/vid"
                >
                  <Play className="h-4 w-4 text-white/80 group-hover/vid:text-white transition-all" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: The Cockpit - 65% width */}
      <div className="flex flex-col w-full lg:w-[65%] h-full bg-background relative">
        <ScrollArea className="flex-1">
          <div className="p-8 lg:p-12 pb-12 space-y-12">
            {/* Meta Info & Tags */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {exercise.type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {getTypeLabel(exercise.type)}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                  <ArrowLeftRight className="mr-1.5 h-3 w-3" />
                  {getSideLabel(exercise.exerciseSide)}
                </span>
              </div>
            </div>

            {/* Header Content */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground transition-all">
                {exercise.name}
              </h1>
              {hasTags && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {exercise.mainTags?.map((tag) => (
                    isTagObject(tag) ? (
                      <ColorBadge 
                        key={tag.id} 
                        color={tag.color} 
                        className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider bg-transparent border-current/20"
                        variant="outline"
                      >
                        {tag.name}
                      </ColorBadge>
                    ) : (
                      <Badge key={tag} variant="outline" className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider opacity-60">
                        {tag}
                      </Badge>
                    )
                  ))}
                  {exercise.additionalTags?.map((tag) => (
                    isTagObject(tag) ? (
                      <ColorBadge 
                        key={tag.id} 
                        color={tag.color} 
                        className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider opacity-40 border-current/10"
                        variant="outline"
                      >
                        {tag.name}
                      </ColorBadge>
                    ) : (
                      <Badge key={tag} variant="outline" className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider opacity-40">
                        {tag}
                      </Badge>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { id: 'sets', label: 'Serie', value: exercise.sets, icon: Repeat, color: 'text-primary' },
                { id: 'reps', label: 'Powtórzenia', value: exercise.reps, icon: Dumbbell, color: 'text-secondary' },
                { id: 'duration', label: 'Czas', value: exercise.duration ? `${exercise.duration}s` : null, icon: Clock, color: 'text-info' },
                { id: 'rest', label: 'Przerwa', value: exercise.restSets ? `${exercise.restSets}s` : null, icon: Timer, color: 'text-orange-500' },
                { id: 'prep', label: 'Przygotowanie', value: exercise.preparationTime ? `${exercise.preparationTime}s` : null, icon: Clock, color: 'text-emerald-500' },
              ].filter(m => m.value).map((metric) => (
                <div key={metric.id} className="rounded-2xl p-4 bg-card border border-border/60 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <metric.icon className={cn("h-4 w-4 mb-3", metric.color)} />
                  <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                    {metric.value || '—'}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-2">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Description / Instructions */}
            {exercise.description && (
              <div className="space-y-10 mt-8">
                {(() => {
                  const sections = exercise.description.split(/(?=Instrukcja:|Najczęstsze błędy:)/i);
                  return sections.map((section, idx) => {
                    const isInstruction = /^Instrukcja:/i.test(section);
                    const isErrors = /^Najczęstsze błędy:/i.test(section);
                    
                    if (isInstruction || isErrors) {
                      const parts = section.split(':');
                      const title = parts[0];
                      const content = parts.slice(1).join(':').trim();
                      
                      return (
                        <div key={section} className={cn(
                          "space-y-5 p-8 rounded-2xl border transition-all",
                          isErrors 
                            ? "bg-destructive/3 border-destructive/10" 
                            : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-xl",
                              isErrors ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                            )}>
                              {isInstruction ? <Play className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </div>
                            <span className={cn(
                              "text-[11px] uppercase font-bold tracking-widest",
                              isErrors ? "text-destructive/80" : "text-muted-foreground"
                            )}>
                              {title}
                            </span>
                          </div>
                          
                          {isErrors ? (
                            <ul className="space-y-3">
                              {content.split(/\.|\n/).filter(p => p.trim()).map((point) => (
                                <li key={point} className="flex gap-3 text-muted-foreground leading-relaxed">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/40" />
                                  <span>
                                    {point.trim().split(/(Unikaj:|Pamiętaj:)/i).map((part, pIdx) => (
                                      /Unikaj:|Pamiętaj:/i.test(part) 
                                        ? <strong key={pIdx} className="font-bold text-foreground uppercase text-[11px] tracking-wide mr-1">{part}</strong>
                                        : part
                                    ))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="space-y-4">
                              {content.split(/\n\n+/).filter(p => p.trim()).map((paragraph, pIdx) => (
                                <p key={pIdx} className="text-lg leading-relaxed text-muted-foreground font-medium">
                                  {paragraph.trim().split(/(Unikaj:|Pamiętaj:)/i).map((part, sIdx) => (
                                    /Unikaj:|Pamiętaj:/i.test(part) 
                                      ? <strong key={sIdx} className="font-bold text-foreground uppercase text-[11px] tracking-wide mr-1">{part}</strong>
                                      : part
                                  ))}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={section} className="space-y-4">
                        {!isInstruction && !isErrors && idx === 0 && (
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <div className="h-px w-8 bg-border" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">O ćwiczeniu</span>
                          </div>
                        )}
                        <div className="space-y-4">
                          {section.trim().split(/\n\n+/).filter(p => p.trim()).map((paragraph, pIdx) => (
                            <p key={pIdx} className="text-xl leading-relaxed font-medium text-muted-foreground">
                              {paragraph.trim().split(/(Unikaj:|Pamiętaj:)/i).map((part, sIdx) => (
                                /Unikaj:|Pamiętaj:/i.test(part) 
                                  ? <strong key={sIdx} className="font-bold text-foreground uppercase text-[11px] tracking-wide mr-1">{part}</strong>
                                  : part
                              ))}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Secondary details */}
            <div className="grid gap-4">
              {exercise.notes && (
                <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 space-y-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <FileText className="h-5 w-5" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Notatki</span>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm italic pl-2">
                      "{exercise.notes}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Sticky Footer: Unified Toolbar */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t z-30">
          <div className="relative flex items-center justify-between gap-3">
            {/* Left Side: Secondary Tools */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl shadow-2xl border-border/50 backdrop-blur-xl">
                  <DropdownMenuItem onClick={() => setLightboxOpen(true)} className="rounded-xl p-4 transition-colors">
                    <ZoomIn className="mr-4 h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-bold">Powiększ</span>
                      <span className="text-[11px] text-muted-foreground/60">Zobacz detale zdjęcia</span>
                    </div>
                  </DropdownMenuItem>
                  {exercise.videoUrl && (
                    <DropdownMenuItem asChild className="rounded-xl p-4 transition-colors">
                      <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer">
                        <Play className="mr-4 h-5 w-5 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-bold">Wideo</span>
                          <span className="text-[11px] text-muted-foreground/60">Otwórz instrukcję wideo</span>
                        </div>
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-2 opacity-50" />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl p-4 transition-colors"
                  >
                    <Trash2 className="mr-4 h-5 w-5" />
                    <div className="flex flex-col">
                      <span className="font-bold">Usuń ćwiczenie</span>
                      <span className="text-[11px] opacity-60">Operacja nieodwracalna</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right Side: Action Cluster */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-2 rounded-xl border-primary/20 hover:bg-primary/5 transition-all"
                onClick={() => setIsChatOpen(true)}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline font-medium">Asystent AI</span>
              </Button>
              
              <Button 
                size="lg" 
                className="h-11 px-6 rounded-xl font-bold bg-primary text-white shadow-md hover:bg-primary/90 transition-all"
                onClick={handleAddToSet}
              >
                <FolderPlus className="mr-2 h-5 w-5" />
                Dodaj do zestawu
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {organizationId && (
        <ExerciseDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          exercise={exercise}
          organizationId={organizationId}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń ćwiczenie"
        description={`Czy na pewno chcesz usunąć ćwiczenie "${exercise.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Add to Set Dialog with AI */}
      <AddExerciseToSetsDialog
        open={isAddToSetDialogOpen}
        onOpenChange={setIsAddToSetDialogOpen}
        exercise={exercise}
      />

      {/* Image Lightbox */}
      {currentImage && (
        <ImageLightbox
          src={currentImage}
          alt={exercise.name}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          images={allImages.length > 1 ? allImages : undefined}
          currentIndex={selectedImageIndex}
          onIndexChange={setSelectedImageIndex}
        />
      )}
    </div>
  );
}
