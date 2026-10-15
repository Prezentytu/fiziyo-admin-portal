import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['badge', 'control', 'card', 'dialog', 'sheet'],
      shadow: ['raised', 'floating', 'dialog', 'card', 'card-hover'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
