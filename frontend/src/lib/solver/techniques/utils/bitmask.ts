/**
 * Bitmask utility functions for Sudoku candidate manipulation.
 */

/**
 * Count the number of set bits in a bitmask.
 */
export function popcount(n: number): number {
    let count = 0;
    while (n) {
        n &= n - 1;
        count++;
    }
    return count;
}

/**
 * Get the single digit from a bitmask (assumes only one bit is set).
 */
export function getSingleDigit(mask: number): number | null {
    if (popcount(mask) !== 1) {
        return null;
    }
    // Find which bit is set
    for (let d = 1; d <= 9; d++) {
        if (mask & (1 << (d - 1))) {
            return d;
        }
    }
    return null;
}

/**
 * Extract all digits from a bitmask.
 */
export function getDigitsFromMask(mask: number): number[] {
    const digits: number[] = [];
    for (let d = 1; d <= 9; d++) {
        if (mask & (1 << (d - 1))) {
            digits.push(d);
        }
    }
    return digits;
}
