"use client";

import { cn } from "@/lib/utils";
import { Dumbbell, FolderKanban, User, Image as ImageIcon } from "lucide-react";

type PlaceholderType = "exercise" | "set" | "patient" | "generic";

interface ImagePlaceholderProps {
  type?: PlaceholderType;
  className?: string;
  iconClassName?: string;
}

const iconMap = {
  exercise: Dumbbell,
  set: FolderKanban,
  patient: User,
  generic: ImageIcon,
};

export function ImagePlaceholder({ 
  type = "generic", 
  className,
  iconClassName,
}: ImagePlaceholderProps) {
  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        "image-placeholder w-full h-full rounded-lg",
        className
      )}
    >
      <Icon className={cn("h-8 w-8", iconClassName)} />
    </div>
  );
}




















