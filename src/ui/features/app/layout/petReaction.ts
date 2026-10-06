/**
 * Behaviour authority for Pixel Pet: which reactions exist and which one is
 * active. How a reaction is *drawn* lives in `PetAvatar`.
 */
export type PetReaction = 'idle' | 'happy' | 'nod' | 'alert';

export const PET_REACTIONS: PetReaction[] = ['idle', 'happy', 'nod', 'alert'];
