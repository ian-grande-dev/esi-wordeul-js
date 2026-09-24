"use strict";

/**
 * Word lists are hosted on the school's GitLab: one raw file per word length (6 to 10).
 */
const DICTIONARY_API = "https://git.esi-bru.be/api/v4/projects/51440/repository/files";

/** Pending or resolved requests, keyed by word length, so each list is downloaded only once. */
const dictionaryCache = new Map();

/** Words accepted during the current game (upper case). */
let dictionary = new Set();

/**
 * Loads the list of words of the given length and makes it the active dictionary.
 * @param {number} length - word length, between 6 and 10
 * @returns {Promise<string[]>} the words, in upper case
 * @throws {Error} if the list cannot be downloaded
 */
async function loadDictionary(length) {
    if (!dictionaryCache.has(length)) {
        dictionaryCache.set(length, fetchWords(length));
    }
    try {
        const words = await dictionaryCache.get(length);
        dictionary = new Set(words);
        return words;
    } catch (error) {
        dictionaryCache.delete(length); // allow a new attempt later
        throw error;
    }
}

/**
 * Downloads and parses the word list for the given length.
 * Only plain A–Z words of the expected length are kept.
 * @param {number} length - word length
 * @returns {Promise<string[]>} the words, in upper case
 */
async function fetchWords(length) {
    const response = await fetch(`${DICTIONARY_API}/${length}/raw`);
    if (!response.ok) {
        throw new Error(`Dictionary request failed (HTTP ${response.status})`);
    }
    const text = await response.text();
    const validWord = new RegExp(`^[A-Z]{${length}}$`);
    const words = text.split("\n")
        .map((word) => word.trim().toUpperCase())
        .filter((word) => validWord.test(word));
    if (words.length === 0) {
        throw new Error("Dictionary is empty");
    }
    return words;
}

/**
 * Tells whether a word belongs to the active dictionary.
 * @param {string} word - the word, in upper case
 * @returns {boolean} true if the word exists
 */
function isWordInDictionary(word) {
    return dictionary.has(word);
}
