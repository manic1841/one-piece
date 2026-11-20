/**
 * Pixel Pet vocabulary: which moods exist and which of them are continuous.
 *
 * Pure data, so it sits in the ViewModel tier — `constants` (labels) and Surface
 * components may both read it without reaching into a Controller.
 */
export type PetBaseMood = 'rest' | 'sleep';
export type PetEventMood = 'move' | 'nod' | 'celebrate' | 'alert';
export type PetMood = PetBaseMood | PetEventMood;

/** Runtime counterpart of `PetMood`, for input the compiler cannot check. */
export const PET_MOODS: readonly PetMood[] = ['rest', 'sleep', 'move', 'nod', 'celebrate', 'alert'];

/** The continuous moods; only these cycle through their bound animations. */
export const PET_BASE_MOODS: readonly PetBaseMood[] = ['rest', 'sleep'];

/** A continuous mood never reports an end, so it may hold a looping animation. */
export const isBaseMood = (mood: PetMood): mood is PetBaseMood =>
  (PET_BASE_MOODS as readonly string[]).includes(mood);
