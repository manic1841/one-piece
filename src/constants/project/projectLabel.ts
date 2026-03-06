import { ProjectCategory } from '@/domains/project/types/categories';

export const CATEGORY_LABELS: Record<string, string> = {
  [ProjectCategory.OPERATING]: '營運類',
  [ProjectCategory.FINANCING]: '融資類',
  [ProjectCategory.INVESTING]: '投資類',
  [ProjectCategory.ASSET]: '資產類',
  [ProjectCategory.LIABILITY]: '負債類',
  [ProjectCategory.RECONCILIATION]: '調節類',
  [ProjectCategory.PERSONAL]: '個人類',
};

export const ICON_OPTIONS = [
  '🏠',
  '🏢',
  '🏪',
  '🏬',
  '🏭',
  '🏘️',
  '🛒',
  '🛍️',
  '🍚',
  '🍜',
  '🍞',
  '🧋',
  '🚗',
  '🚎',
  '🚑',
  '🪙',
  '💰',
  '💵',
  '💴',
  '💶',
  '💷',
  '💳',
  '💸',
  '🧾',
  '🏦',
  '📱',
  '💻',
  '🎧',
  '💊',
  '🧬',
  '📋',
  '📌',
  '🎓',
  '🎯',
  '🎨',
  '🎭',
  '🎬',
  '🎵',
  '🏀',
  '🏓',
];
export const COLOR_OPTIONS = [
  '#3B82F6', // Blue 500
  '#EF4444', // Red 500
  '#10B981', // Emerald 500
  '#F59E0B', // Amber 500
  '#8B5CF6', // Violet 500
];
