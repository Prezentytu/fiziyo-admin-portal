"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AuthHeaderProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
}

export function AuthHeader({ title, backHref, onBack }: AuthHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-8 w-8 rounded-full bg-surface-light hover:bg-surface-hover"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </Button>
      <span className="text-base font-semibold text-foreground">{title}</span>
      <div className="w-8" />
    </div>
  );
}






