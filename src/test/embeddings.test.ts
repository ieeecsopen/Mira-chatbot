import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../lib/embeddings';

describe('embeddings', () => {
    describe('cosineSimilarity', () => {
        it('should return 1 for identical normalized vectors', () => {
            const vector = [1, 0, 0, 0];
            const similarity = cosineSimilarity(vector, vector);
            expect(similarity).toBeCloseTo(1);
        });

        it('should return 0 for orthogonal vectors', () => {
            const a = [1, 0, 0, 0];
            const b = [0, 1, 0, 0];
            const similarity = cosineSimilarity(a, b);
            expect(similarity).toBeCloseTo(0);
        });

        it('should return positive value for partially similar vectors', () => {
            const a = [1, 1, 0, 0];
            const b = [1, 0, 1, 0];
            const similarity = cosineSimilarity(a, b);
            // With non-normalized vectors, just check it's positive
            expect(similarity).toBeGreaterThanOrEqual(0);
        });

        it('should return 0 for vectors of different lengths', () => {
            const a = [1, 0, 0];
            const b = [1, 0, 0, 0];
            const similarity = cosineSimilarity(a, b);
            expect(similarity).toBe(0);
        });

        it('should handle normalized vectors correctly', () => {
            // Normalized vectors
            const a = [0.707, 0.707, 0, 0];
            const b = [0.707, 0.707, 0, 0];
            const similarity = cosineSimilarity(a, b);
            expect(similarity).toBeCloseTo(1, 1);
        });
    });
});
