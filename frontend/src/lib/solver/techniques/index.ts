/**
 * Sudoku solving techniques index.
 *
 * Techniques are organized by difficulty level:
 * - Beginner (1): Naked Single, Hidden Single
 * - Easy (2): Pointing Pair, Box-Line Reduction
 * - Medium (3): Hidden Pair
 * - Medium-Hard (4): Naked Pair, Hidden Triple, Pointing Triple, Box-Line Reduction Triple
 * - Hard (5): Naked Triple, Hidden Quad
 * - Very Hard (6): X-Wing, Naked Quad
 * - Expert (7): Swordfish, Jellyfish, Two-String Kite
 * - Expert+ (8): XY-Wing, W-Wing, BUG
 * - Master (9): XYZ-Wing, Remote Pairs, Unique Rectangles, Skyscraper, Turbot Fish
 * - Grandmaster (10): WXYZ-Wing, Simple Coloring, Forcing Chains, etc.
 */

// Beginner (Difficulty 1)
export { findHiddenSingle, findNakedSingle } from './beginner';

// Easy (Difficulty 2)
export { findPointingPair, findBoxLineReduction } from './easy';

// Medium (Difficulty 3)
export { findHiddenPair } from './medium';

// Medium-Hard (Difficulty 4)
export {
	findNakedPair,
	findHiddenTriple,
	findPointingTriple,
	findBoxLineReductionTriple,
} from './mediumHard';

// Hard (Difficulty 5)
export { findNakedTriple, findHiddenQuad } from './hard';

// Very Hard (Difficulty 6)
export { findXWing, findNakedQuad } from './veryHard';

// Expert (Difficulty 7)
export { findSwordfish, findJellyfish, findTwoStringKite } from './expert';

// Expert+ (Difficulty 8)
export { findXYWing, findWWing, findBUG } from './expertPlus';

// Master (Difficulty 9)
export {
	findXYZWing,
	findRemotePairs,
	findUniqueRectangleType1,
	findUniqueRectangleType2,
	findUniqueRectangleType3,
	findSkyscraper,
	findTurbotFish,
} from './master';

// Grandmaster (Difficulty 10)
export {
	findWXYZWing,
	findSimpleColoring,
	findMultiColoring,
	findForcingChain,
	findXYChain,
	findXCycle,
	findAIC,
	findNiceLoop,
	findGroupedNiceLoop,
	findNishio,
	findBowmansBingo,
	findDeathBlossom,
	findKrakenFish,
	findALS,
	findALSXZ,
	findALSXYWing,
	findSueDeCoq,
	findBruteforce,
	BRUTEFORCE_ENABLED,
} from './grandmaster';

// Utilities
export { popcount, getSingleDigit, getCellName, applyTechnique } from './utils';

// Export all techniques as an array for easy iteration
import { findHiddenSingle, findNakedSingle } from './beginner';
import { findPointingPair, findBoxLineReduction } from './easy';
import { findHiddenPair } from './medium';
import {
	findNakedPair,
	findHiddenTriple,
	findPointingTriple,
	findBoxLineReductionTriple,
} from './mediumHard';
import { findNakedTriple, findHiddenQuad } from './hard';
import { findXWing, findNakedQuad } from './veryHard';
import { findSwordfish, findJellyfish, findTwoStringKite } from './expert';
import { findXYWing, findWWing, findBUG } from './expertPlus';
import {
	findXYZWing,
	findRemotePairs,
	findUniqueRectangleType1,
	findUniqueRectangleType2,
	findUniqueRectangleType3,
	findSkyscraper,
	findTurbotFish,
} from './master';
import {
	findWXYZWing,
	findSimpleColoring,
	findMultiColoring,
	findForcingChain,
	findXYChain,
	findXCycle,
	findAIC,
	findNiceLoop,
	findGroupedNiceLoop,
	findNishio,
	findBowmansBingo,
	findDeathBlossom,
	findKrakenFish,
	findALS,
	findALSXZ,
	findALSXYWing,
	findSueDeCoq,
	findBruteforce,
} from './grandmaster';

import type { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';

export const allTechniques: Array<(grid: SolverGrid) => TechniqueResult | null> = [
	// Beginner (Difficulty 1)
	findHiddenSingle,
	findNakedSingle,
	// Easy (Difficulty 2)
	findPointingPair,
	findBoxLineReduction,
	// Medium (Difficulty 3)
	findHiddenPair,
	// Medium-Hard (Difficulty 4)
	findNakedPair,
	findHiddenTriple,
	findPointingTriple,
	findBoxLineReductionTriple,
	// Hard (Difficulty 5)
	findNakedTriple,
	findHiddenQuad,
	// Very Hard (Difficulty 6)
	findXWing,
	findNakedQuad,
	// Expert (Difficulty 7)
	findSwordfish,
	findJellyfish,
	findTwoStringKite,
	// Expert+ (Difficulty 8)
	findXYWing,
	findWWing,
	findBUG,
	// Master (Difficulty 9)
	findXYZWing,
	findRemotePairs,
	findUniqueRectangleType1,
	findUniqueRectangleType2,
	findUniqueRectangleType3,
	findSkyscraper,
	findTurbotFish,
	// Grandmaster (Difficulty 10)
	findWXYZWing,
	findSimpleColoring,
	findMultiColoring,
	findForcingChain,
	findXYChain,
	findXCycle,
	findAIC,
	findNiceLoop,
	findGroupedNiceLoop,
	findNishio,
	findBowmansBingo,
	findDeathBlossom,
	findKrakenFish,
	findALS,
	findALSXZ,
	findALSXYWing,
	findSueDeCoq,
	// Bruteforce (fallback, development only)
	findBruteforce,
];

/**
 * Techniques safe for use during puzzle generation.
 * Excludes techniques that rely on uniqueness (BUG, Unique Rectangles)
 * to avoid circular reasoning where the generator accepts a non-unique puzzle
 * because it "proved" validity using uniqueness.
 */
export const generationTechniques = allTechniques.filter(
	(t) =>
		t !== findBUG &&
		t !== findUniqueRectangleType1 &&
		t !== findUniqueRectangleType2 &&
		t !== findUniqueRectangleType3,
);
