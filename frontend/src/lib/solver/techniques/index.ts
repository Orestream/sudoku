// Beginner (Difficulty 1)
export { findHiddenSingle } from './beginner';

// Easy (Difficulty 2)
export { findNakedSingle, findPointingPair, findBoxLineReduction } from './easy';

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
export { findSwordfish, findJellyfish } from './expert';

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
	findTwoStringKite,
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
} from './grandmaster';

// Utilities
export { popcount, getSingleDigit, getCellName, applyTechnique } from './utils';

// Export all techniques as an array for easy iteration
import { findHiddenSingle } from './beginner';
import { findNakedSingle, findPointingPair, findBoxLineReduction } from './easy';
import { findHiddenPair } from './medium';
import {
	findNakedPair,
	findHiddenTriple,
	findPointingTriple,
	findBoxLineReductionTriple,
} from './mediumHard';
import { findNakedTriple, findHiddenQuad } from './hard';
import { findXWing, findNakedQuad } from './veryHard';
import { findSwordfish, findJellyfish } from './expert';
import { findXYWing, findWWing, findBUG } from './expertPlus';
import {
	findXYZWing,
	findRemotePairs,
	findUniqueRectangleType1,
	findUniqueRectangleType2,
	findUniqueRectangleType3,
	findSkyscraper,
	findTwoStringKite,
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
} from './grandmaster';

import type { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';

export const allTechniques: Array<(grid: SolverGrid) => TechniqueResult | null> = [
	// Beginner (Difficulty 1)
	findHiddenSingle,
	// Easy (Difficulty 2)
	findNakedSingle,
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
	findTwoStringKite,
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
];
