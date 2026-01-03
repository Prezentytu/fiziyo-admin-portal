'use client';

import { useState, useMemo } from 'react';
import { Search, Tag, Star, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { cn } from '@/lib/utils';

interface ExerciseTag {
  id: string;
  name: string;
  color: string;
  isMain?: boolean;
  categoryId?: string;
}

interface TagPickerProps {
  availableTags: ExerciseTag[];
  selectedMainTags: string[];
  selectedAdditionalTags: string[];
  onMainTagsChange: (tags: string[]) => void;
  onAdditionalTagsChange: (tags: string[]) => void;
  maxMainTags?: number;
  initialVisibleCount?: number;
}

export function TagPicker({
  availableTags,
  selectedMainTags,
  selectedAdditionalTags,
  onMainTagsChange,
  onAdditionalTagsChange,
  maxMainTags = 3,
  initialVisibleCount = 12,
}: TagPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!searchQuery) return availableTags;
    const query = searchQuery.toLowerCase();
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(query)
    );
  }, [availableTags, searchQuery]);

  // Group and limit tags
  const displayedTags = useMemo(() => {
    const mainTags = filteredTags.filter((t) => t.isMain);
    const otherTags = filteredTags.filter((t) => !t.isMain);

    // If searching, show all matching results
    if (searchQuery) {
      return { mainTags, otherTags, hasMore: false, totalHidden: 0 };
    }

    // Otherwise limit to initialVisibleCount
    const allTags = [...mainTags, ...otherTags];
    const visibleTags = showAll ? allTags : allTags.slice(0, initialVisibleCount);
    const hiddenCount = allTags.length - initialVisibleCount;

    return {
      mainTags: visibleTags.filter(t => t.isMain),
      otherTags: visibleTags.filter(t => !t.isMain),
      hasMore: !showAll && hiddenCount > 0,
      totalHidden: hiddenCount,
    };
  }, [filteredTags, searchQuery, showAll, initialVisibleCount]);

  // Check if tag is selected (in either main or additional)
  const isTagSelected = (tagId: string) => {
    return selectedMainTags.includes(tagId) || selectedAdditionalTags.includes(tagId);
  };

  const isMainTag = (tagId: string) => selectedMainTags.includes(tagId);

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    if (selectedMainTags.includes(tagId)) {
      onMainTagsChange(selectedMainTags.filter((id) => id !== tagId));
    } else if (selectedAdditionalTags.includes(tagId)) {
      onAdditionalTagsChange(selectedAdditionalTags.filter((id) => id !== tagId));
    } else {
      onAdditionalTagsChange([...selectedAdditionalTags, tagId]);
    }
  };

  // Promote tag to main
  const promoteToMain = (tagId: string) => {
    if (selectedMainTags.length >= maxMainTags) {
      return;
    }

    if (selectedAdditionalTags.includes(tagId)) {
      onAdditionalTagsChange(selectedAdditionalTags.filter((id) => id !== tagId));
    }

    onMainTagsChange([...selectedMainTags, tagId]);
  };

  // Demote tag from main
  const demoteFromMain = (tagId: string) => {
    onMainTagsChange(selectedMainTags.filter((id) => id !== tagId));
    onAdditionalTagsChange([...selectedAdditionalTags, tagId]);
  };

  // Remove tag completely
  const removeTag = (tagId: string) => {
    onMainTagsChange(selectedMainTags.filter((id) => id !== tagId));
    onAdditionalTagsChange(selectedAdditionalTags.filter((id) => id !== tagId));
  };

  const getTag = (tagId: string) => availableTags.find((t) => t.id === tagId);

  return (
    <div className="space-y-4">
      {/* Selected Tags Section */}
      {(selectedMainTags.length > 0 || selectedAdditionalTags.length > 0) && (
        <div className="space-y-3 p-3 rounded-lg bg-surface-light/50 border border-border/50">
          {/* Main Tags */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500" />
              Główne kategorie
              <span className="text-xs">
                ({selectedMainTags.length}/{maxMainTags})
              </span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {selectedMainTags.map((tagId) => {
                const tag = getTag(tagId);
                if (!tag) return null;
                return (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-primary/30 bg-primary/10"
                  >
                    <ColorBadge color={tag.color} size="sm" className="border-0 bg-transparent px-0 py-0">
                      {tag.name}
                    </ColorBadge>
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
              {selectedMainTags.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Kliknij ★ aby oznaczyć jako główny
                </p>
              )}
            </div>
          </div>

          {/* Additional Tags */}
          {selectedAdditionalTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Tag className="h-3 w-3" />
                Dodatkowe
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedAdditionalTags.map((tagId) => {
                  const tag = getTag(tagId);
                  if (!tag) return null;
                  return (
                    <div
                      key={tag.id}
                      className="group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-border bg-surface"
                    >
                      <span
                        className="text-xs font-medium"
                        style={{ color: tag.color }}
                      >
                        {tag.name}
                      </span>
                      {selectedMainTags.length < maxMainTags && (
                        <button
                          type="button"
                          onClick={() => promoteToMain(tag.id)}
                          className="h-4 w-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:text-yellow-500 transition-all"
                          title="Przenieś do głównych"
                        >
                          <Star className="h-2.5 w-2.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Available Tags Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Dostępne kategorie</Label>
          <span className="text-xs text-muted-foreground">
            {availableTags.length} tagów
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj kategorii..."
            className="pl-9 h-9"
          />
        </div>

        {availableTags.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Tag className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Brak dostępnych kategorii</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Brak wyników dla "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Popular Tags */}
            {displayedTags.mainTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Popularne
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {displayedTags.mainTags.map((tag) => (
                    <TagButton
                      key={tag.id}
                      tag={tag}
                      isSelected={isTagSelected(tag.id)}
                      isMain={isMainTag(tag.id)}
                      canPromote={selectedMainTags.length < maxMainTags && !isMainTag(tag.id)}
                      onToggle={() => toggleTag(tag.id)}
                      onPromote={() => promoteToMain(tag.id)}
                      onDemote={() => demoteFromMain(tag.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Tags */}
            {displayedTags.otherTags.length > 0 && (
              <div className="space-y-2">
                {displayedTags.mainTags.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pozostałe
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {displayedTags.otherTags.map((tag) => (
                    <TagButton
                      key={tag.id}
                      tag={tag}
                      isSelected={isTagSelected(tag.id)}
                      isMain={isMainTag(tag.id)}
                      canPromote={selectedMainTags.length < maxMainTags && !isMainTag(tag.id)}
                      onToggle={() => toggleTag(tag.id)}
                      onPromote={() => promoteToMain(tag.id)}
                      onDemote={() => demoteFromMain(tag.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Show more button */}
            {displayedTags.hasMore && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full text-xs text-muted-foreground gap-1"
              >
                <ChevronDown className="h-3 w-3" />
                Pokaż więcej ({displayedTags.totalHidden})
              </Button>
            )}

            {showAll && !searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(false)}
                className="w-full text-xs text-muted-foreground gap-1"
              >
                <ChevronUp className="h-3 w-3" />
                Zwiń
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tag button component with colors
function TagButton({
  tag,
  isSelected,
  isMain,
  canPromote,
  onToggle,
  onPromote,
  onDemote,
}: {
  tag: ExerciseTag;
  isSelected: boolean;
  isMain: boolean;
  canPromote: boolean;
  onToggle: () => void;
  onPromote: () => void;
  onDemote: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-0.5 rounded-full transition-all cursor-pointer',
        isSelected
          ? isMain
            ? 'ring-2 ring-primary/30'
            : 'ring-1 ring-border'
          : 'hover:ring-1 hover:ring-border/50'
      )}
      style={{
        backgroundColor: isSelected
          ? `${tag.color}15`
          : `${tag.color}08`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-l-full text-xs font-medium transition-colors',
          isSelected && 'pr-0.5'
        )}
        style={{ color: tag.color }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: tag.color }}
        />
        {tag.name}
        {isSelected && (
          <span className="text-primary ml-0.5">✓</span>
        )}
      </button>

      {isSelected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isMain) {
              onDemote();
            } else if (canPromote) {
              onPromote();
            }
          }}
          className={cn(
            'p-1 pr-1.5 rounded-r-full transition-colors',
            isMain
              ? 'text-yellow-500 hover:bg-yellow-500/10'
              : canPromote
              ? 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
              : 'text-muted-foreground/30 cursor-not-allowed'
          )}
          title={isMain ? 'Usuń z głównych' : canPromote ? 'Oznacz jako główny' : `Limit ${3} głównych tagów`}
          disabled={!isMain && !canPromote}
        >
          <Star className={cn('h-3 w-3', isMain && 'fill-current')} />
        </button>
      )}
    </div>
  );
}
