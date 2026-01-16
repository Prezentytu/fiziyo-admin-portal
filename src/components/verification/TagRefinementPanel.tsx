"use client";

import { useState } from "react";
import { Tag, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface TagRefinementPanelProps {
  exercise: AdminExercise;
  mainTags: string[];
  additionalTags: string[];
  onMainTagsChange: (tags: string[]) => void;
  onAdditionalTagsChange: (tags: string[]) => void;
  className?: string;
}

// Tag category colors (based on backend TagCategory)
const TAG_CATEGORY_COLORS: Record<string, string> = {
  // Body parts - blue
  "ramię": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "bark": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "plecy": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "nogi": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "kolano": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "biodro": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "stopa": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "kręgosłup": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  // Equipment - gray
  "piłka": "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  "taśma": "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  "hantle": "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  "mata": "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  // Exercise type - purple
  "rozciąganie": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "wzmacnianie": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "mobilizacja": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "oddychanie": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  // Difficulty - amber
  "początkujący": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "średniozaawansowany": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "zaawansowany": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function getTagColor(tag: string): string {
  const tagLower = tag.toLowerCase();
  for (const [keyword, color] of Object.entries(TAG_CATEGORY_COLORS)) {
    if (tagLower.includes(keyword)) {
      return color;
    }
  }
  return "bg-muted text-muted-foreground border-border";
}

interface TagListProps {
  tags: string[];
  onRemove: (tag: string) => void;
  isMain?: boolean;
}

function TagList({ tags, onRemove, isMain }: TagListProps) {
  if (tags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        Brak tagów {isMain ? "głównych" : "dodatkowych"}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className={cn(
            "pr-1.5 gap-1.5 group cursor-default",
            getTagColor(tag),
            isMain && "font-semibold"
          )}
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="ml-0.5 h-4 w-4 rounded-full flex items-center justify-center hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

export function TagRefinementPanel({
  exercise,
  mainTags,
  additionalTags,
  onMainTagsChange,
  onAdditionalTagsChange,
  className,
}: TagRefinementPanelProps) {
  const [newMainTag, setNewMainTag] = useState("");
  const [newAdditionalTag, setNewAdditionalTag] = useState("");

  const handleAddMainTag = () => {
    const tag = newMainTag.trim();
    if (tag && !mainTags.includes(tag)) {
      onMainTagsChange([...mainTags, tag]);
      setNewMainTag("");
    }
  };

  const handleAddAdditionalTag = () => {
    const tag = newAdditionalTag.trim();
    if (tag && !additionalTags.includes(tag)) {
      onAdditionalTagsChange([...additionalTags, tag]);
      setNewAdditionalTag("");
    }
  };

  const handleRemoveMainTag = (tag: string) => {
    onMainTagsChange(mainTags.filter((t) => t !== tag));
  };

  const handleRemoveAdditionalTag = (tag: string) => {
    onAdditionalTagsChange(additionalTags.filter((t) => t !== tag));
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Tagi i kategoryzacja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Tagi główne</h4>
            <span className="text-xs text-muted-foreground">{mainTags.length} tagów</span>
          </div>
          <TagList tags={mainTags} onRemove={handleRemoveMainTag} isMain />
          <div className="flex gap-2">
            <Input
              placeholder="Dodaj tag główny..."
              value={newMainTag}
              onChange={(e) => setNewMainTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMainTag()}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddMainTag}
              disabled={!newMainTag.trim()}
              className="h-8 px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Additional Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Tagi dodatkowe</h4>
            <span className="text-xs text-muted-foreground">{additionalTags.length} tagów</span>
          </div>
          <TagList tags={additionalTags} onRemove={handleRemoveAdditionalTag} />
          <div className="flex gap-2">
            <Input
              placeholder="Dodaj tag dodatkowy..."
              value={newAdditionalTag}
              onChange={(e) => setNewAdditionalTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAdditionalTag()}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddAdditionalTag}
              disabled={!newAdditionalTag.trim()}
              className="h-8 px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info about changes */}
        {(mainTags.join(",") !== (exercise.mainTags || []).join(",") ||
          additionalTags.join(",") !== (exercise.additionalTags || []).join(",")) && (
          <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg">
            Zmiany w tagach zostaną zapisane wraz z decyzją weryfikacji.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
