import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn/ui class merge helper: composes conditional classes (clsx)
// and resolves conflicting Tailwind utilities (tailwind-merge).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
