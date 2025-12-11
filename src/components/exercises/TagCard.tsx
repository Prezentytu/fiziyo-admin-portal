"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ExerciseTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string;
  isMain?: boolean;
  isGlobal?: boolean;
  categoryId?: string;
  categoryIds?: string[];
  popularity?: number;
}

interface TagCardProps {
  tag: ExerciseTag;
  onEdit?: (tag: ExerciseTag) => void;
  onDelete?: (tag: ExerciseTag) => void;
  className?: string;
}

export function TagCard({ tag, onEdit, onDelete, className }: TagCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-surface p-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: tag.color || "#888" }}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tag.name}</span>
            {tag.isMain && <Badge variant="secondary" className="text-xs">Główny</Badge>}
            {tag.isGlobal && <Badge variant="outline" className="text-xs">Globalny</Badge>}
          </div>
          {tag.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {tag.description}
            </p>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(tag)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tag)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export interface TagCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string;
}

interface CategoryCardProps {
  category: TagCategory;
  onEdit?: (category: TagCategory) => void;
  onDelete?: (category: TagCategory) => void;
  className?: string;
}

export function CategoryCard({ category, onEdit, onDelete, className }: CategoryCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-surface p-3",
        className
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: category.color || "#888" }}
    >
      <div>
        <span className="font-medium">{category.name}</span>
        {category.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {category.description}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(category)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(category)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}




