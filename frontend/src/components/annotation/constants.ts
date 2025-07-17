import type { AnnotationTag } from '@/types/annotation';

export const tagColors: Record<AnnotationTag, string> = {
  button: '#3b82f6',
  input: '#10b981',
  radio: '#f59e0b',
  dropdown: '#8b5cf6',
  text: '#06b6d4',
} as const; 