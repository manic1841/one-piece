import type { PetMood } from '@/ui/features/app/types/petMood';

/** Accessible name of the pet trigger and of the overlay it opens. */
export const PET_TRIGGER_LABEL = 'Pixel Pet';
export const PET_NAVIGATOR_LABEL = 'Navigator';

/** Placeholder face and accessible name per mood, used when art is missing. */
export const PET_MOOD_LABELS: Record<PetMood, { face: string; alt: string }> = {
  rest: { face: '◡', alt: 'Pixel Pet 待機' },
  sleep: { face: '–', alt: 'Pixel Pet 睡著' },
  move: { face: '→', alt: 'Pixel Pet 移動' },
  nod: { face: '◠', alt: 'Pixel Pet 點頭' },
  celebrate: { face: '★', alt: 'Pixel Pet 領獎' },
  alert: { face: '⊙', alt: 'Pixel Pet 注意' },
};
