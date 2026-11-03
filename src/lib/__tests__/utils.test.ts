import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('deduplicates tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles undefined and false values', () => {
    expect(cn('base', undefined, false, null, 'end')).toBe('base end');
  });

  it('resolves design system radius and shadow tokens against tailwind defaults', () => {
    expect(cn('rounded-card', 'rounded-xl')).toBe('rounded-xl');
    expect(cn('rounded-xl', 'rounded-control')).toBe('rounded-control');
    expect(cn('shadow-floating', 'shadow-lg')).toBe('shadow-lg');
    expect(cn('bg-tint-fill', 'bg-grouped')).toBe('bg-grouped');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });
});
