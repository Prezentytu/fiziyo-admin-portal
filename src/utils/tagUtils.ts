/**
 * Utilities for mapping exercise tags from IDs to full objects
 * Mirrors the logic from mobile app (fizjo-app) TagsDisplay.tsx
 */

export interface TagCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  icon?: string;
}

export interface ExerciseTag {
  id: string;
  name: string;
  color?: string | null;
  description?: string;
  icon?: string;
  isMain?: boolean;
  isGlobal?: boolean;
  categoryId?: string | null;
  categoryIds?: string[] | null;
}

export interface ExerciseWithTags {
  id: string;
  name: string;
  mainTags?: (string | ExerciseTag)[];
  additionalTags?: (string | ExerciseTag)[];
}

/**
 * Gets the color for a tag - checks tag's own color first, then category color
 * This mirrors the logic from mobile app TagsDisplay.tsx getTagColor()
 */
export function getTagColor(
  tag: ExerciseTag,
  categoriesMap: Map<string, TagCategory>
): string {
  // First check if tag has its own color
  if (tag.color) {
    return tag.color;
  }

  // Check categoryIds array
  if (tag.categoryIds && tag.categoryIds.length > 0) {
    const category = categoriesMap.get(tag.categoryIds[0]);
    if (category?.color) {
      return category.color;
    }
  }

  // Check categoryId field
  if (tag.categoryId) {
    const category = categoriesMap.get(tag.categoryId);
    if (category?.color) {
      return category.color;
    }
  }

  // Default color (primary green)
  return "#22c55e";
}

/**
 * Creates a Map from category ID to category object for quick lookups
 */
export function createCategoriesMap(
  categories: TagCategory[]
): Map<string, TagCategory> {
  return new Map(categories.map((cat) => [cat.id, cat]));
}

/**
 * Creates a Map from tag ID to tag object with resolved color
 */
export function createTagsMap(
  tags: ExerciseTag[],
  categories: TagCategory[] = []
): Map<string, ExerciseTag> {
  const categoriesMap = createCategoriesMap(categories);

  return new Map(
    tags.map((tag) => [
      tag.id,
      {
        ...tag,
        // Resolve color from category if tag doesn't have its own
        color: getTagColor(tag, categoriesMap),
      },
    ])
  );
}

/**
 * Maps tag IDs to full tag objects for a single exercise
 */
export function mapExerciseTagsToObjects<T extends ExerciseWithTags>(
  exercise: T,
  tagsMap: Map<string, ExerciseTag>
): T {
  return {
    ...exercise,
    mainTags: exercise.mainTags?.map((tagId) => {
      if (typeof tagId === "string") {
        return tagsMap.get(tagId) || tagId;
      }
      return tagId;
    }),
    additionalTags: exercise.additionalTags?.map((tagId) => {
      if (typeof tagId === "string") {
        return tagsMap.get(tagId) || tagId;
      }
      return tagId;
    }),
  };
}

/**
 * Maps tag IDs to full tag objects for an array of exercises
 */
export function mapExercisesWithTags<T extends ExerciseWithTags>(
  exercises: T[],
  tagsMap: Map<string, ExerciseTag>
): T[] {
  return exercises.map((exercise) =>
    mapExerciseTagsToObjects(exercise, tagsMap)
  );
}
