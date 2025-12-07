/**
 * Math Utilities
 *
 * Shared mathematical functions for vector operations and similarity calculations.
 */

/**
 * Calculate cosine similarity between two vectors.
 *
 * Cosine similarity measures the cosine of the angle between two vectors,
 * resulting in a value between -1 and 1, where:
 * - 1 means vectors are identical
 * - 0 means vectors are orthogonal (no similarity)
 * - -1 means vectors are opposite
 *
 * @param vectorA - First vector
 * @param vectorB - Second vector
 * @returns Similarity score between -1 and 1, or 0 if vectors are invalid
 *
 * @example
 * ```typescript
 * const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0]) // Returns 1
 * const similarity = cosineSimilarity([1, 0, 0], [0, 1, 0]) // Returns 0
 * ```
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  // Validate input vectors
  if (!vectorA || !vectorB) {
    return 0;
  }

  if (vectorA.length !== vectorB.length) {
    return 0;
  }

  if (vectorA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const a = vectorA[i];
    const b = vectorB[i];

    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Normalize a vector to unit length.
 *
 * @param vector - Vector to normalize
 * @returns Normalized vector with magnitude of 1
 */
export function normalizeVector(vector: number[]): number[] {
  if (!vector || vector.length === 0) {
    return [];
  }

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(val => val / magnitude);
}

/**
 * Calculate Euclidean distance between two vectors.
 *
 * @param vectorA - First vector
 * @param vectorB - Second vector
 * @returns Euclidean distance, or Infinity if vectors are invalid
 */
export function euclideanDistance(
  vectorA: number[],
  vectorB: number[],
): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return Infinity;
  }

  let sumSquares = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i];
    sumSquares += diff * diff;
  }

  return Math.sqrt(sumSquares);
}

/**
 * Convert cosine distance to similarity score.
 * pgvector uses cosine distance (1 - similarity), this converts back to similarity.
 *
 * @param distance - Cosine distance from pgvector (0 = identical, 2 = opposite)
 * @returns Similarity score (0 to 1)
 */
export function cosineDistanceToSimilarity(distance: number): number {
  return 1 - distance;
}

/**
 * Validate if a vector is valid for similarity operations.
 *
 * @param vector - Vector to validate
 * @param expectedDimension - Expected dimension (optional)
 * @returns True if vector is valid
 */
export function isValidVector(
  vector: unknown,
  expectedDimension?: number,
): vector is number[] {
  if (!Array.isArray(vector)) {
    return false;
  }

  if (vector.length === 0) {
    return false;
  }

  if (expectedDimension !== undefined && vector.length !== expectedDimension) {
    return false;
  }

  return vector.every(val => typeof val === 'number' && Number.isFinite(val));
}
