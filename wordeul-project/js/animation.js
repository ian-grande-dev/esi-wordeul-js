"use strict";

/**
 * Plays the "shake" animation on a board row (used when a guess is rejected).
 * @param {HTMLElement} row - the row to animate
 */
function shake(row) {
    if (row.classList.contains("shaking")) {
        return; // already shaking
    }
    row.classList.add("shaking");
    row.addEventListener("animationend", () => row.classList.remove("shaking"), {once: true});
}

/**
 * Returns the total duration of a row reveal, read from the CSS custom properties
 * so that JavaScript and CSS timings always stay in sync.
 * @param {number} tileCount - number of tiles in the row
 * @returns {number} the duration in milliseconds
 */
function revealDuration(tileCount) {
    const styles = getComputedStyle(document.documentElement);
    const step = parseFloat(styles.getPropertyValue("--reveal-step")) || 0;
    const flip = parseFloat(styles.getPropertyValue("--flip-duration")) || 0;
    return (tileCount - 1) * step + flip;
}
