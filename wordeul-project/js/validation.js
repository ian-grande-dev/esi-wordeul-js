"use strict";

/**
 * Priority of each letter state: a keyboard key never goes back to a "weaker" state
 * (e.g. a key already marked "correct" stays green).
 */
const STATE_PRIORITY = {
    absent: 1, present: 2, correct: 3,
};

/**
 * Compares a guess with the target word and returns the state of each letter.
 *
 * Two passes are needed to handle repeated letters correctly:
 * 1. exact matches are marked "correct" and removed from the pool of available letters;
 * 2. remaining letters are marked "present" only while the target still has unused copies.
 *
 * @example evaluateGuess("ALLEES", "BALLES") // ["present", "present", "correct", "absent", "correct", "correct"]
 * @param {string} guess - the proposed word (upper case)
 * @param {string} target - the word to find (upper case), same length as the guess
 * @returns {string[]} one state per letter: "correct", "present" or "absent"
 */
function evaluateGuess(guess, target) {
    const states = Array.from(guess, () => "absent");
    const unmatched = {}; // letter -> number of target copies not matched yet

    for (let i = 0; i < target.length; i++) {
        if (guess[i] === target[i]) {
            states[i] = "correct";
        } else {
            unmatched[target[i]] = (unmatched[target[i]] ?? 0) + 1;
        }
    }

    for (let i = 0; i < guess.length; i++) {
        if (states[i] !== "correct" && unmatched[guess[i]] > 0) {
            states[i] = "present";
            unmatched[guess[i]]--;
        }
    }
    return states;
}

/**
 * Returns the stronger of two letter states.
 * @param {string|undefined} current - the state already shown (may be undefined)
 * @param {string} next - the new state
 * @returns {string} the state to keep
 */
function strongerState(current, next) {
    if (!current) {
        return next;
    }
    return STATE_PRIORITY[next] > STATE_PRIORITY[current] ? next : current;
}
