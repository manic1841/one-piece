/**
 * Text formatting utilities
 */

/**
 * Format category for display
 */
export const formatCategory = (category: string, subcategory?: string): string => {
  if (subcategory) {
    return `${category} - ${subcategory}`;
  }
  return category;
};
