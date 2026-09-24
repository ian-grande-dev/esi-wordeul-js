"use strict";

const resultDialog = document.getElementById("result-dialog");
const toastEl = document.getElementById("toast");
let toastTimer = 0;

/**
 * Opens the end-of-game dialog.
 * @param {boolean} won - true if the player found the word
 * @param {string} target - the word to find
 * @param {number} guesses - number of guesses used
 */
function openResultDialog(won, target, guesses) {
    const title = document.getElementById("result-title");
    const message = document.getElementById("result-message");
    const word = document.createElement("strong");
    word.textContent = target;

    if (won) {
        title.textContent = "Bravo !";
        message.textContent = `Mot trouvé en ${guesses} essai${guesses > 1 ? "s" : ""} : `;
    } else {
        title.textContent = "Perdu";
        message.textContent = "Le mot était : ";
    }
    message.append(word);
    resultDialog.showModal();
}

/**
 * Closes the end-of-game dialog.
 */
function closeResultDialog() {
    resultDialog.close();
}

/**
 * Shows a short message at the top of the screen for a couple of seconds.
 * @param {string} text - the message
 */
function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 1800);
}
