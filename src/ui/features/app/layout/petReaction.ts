export type PetReaction = 'idle' | 'happy' | 'nod' | 'alert';

export const PET_REACTIONS: PetReaction[] = ['idle', 'happy', 'nod', 'alert'];

export const PET_FACES: Record<PetReaction, string> = {
  idle: '◡',
  happy: '◡‿◡',
  nod: '◠‿◠',
  alert: '⊙',
};
