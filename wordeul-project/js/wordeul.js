"use strict";

/* ==========================================================================
   Game state and DOM references
   ========================================================================== */

const MIN_LENGTH = 6;
const MAX_LENGTH = 10;

/** AZERTY layout of the on-screen keyboard. */
const KEYBOARD_LAYOUT = [
    [..."AZERTYUIOP"],
    [..."QSDFGHJKLM"],
    ["ENTER", ..."WXCVBN", "BACKSPACE"],
];

/** Labels of the special keys. */
const SPECIAL_KEYS = {
    ENTER: {label: "Entrée", ariaLabel: "Valider"},
    BACKSPACE: {label: "⌫", ariaLabel: "Effacer"},
};

const setupView = document.getElementById("setup-view");
const gameView = document.getElementById("game-view");
const setupForm = document.getElementById("setup-form");
const formError = document.getElementById("form-error");
const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");

/** Current game. `over` is true whenever the board must not accept input. */
const game = {
    target: "",
    attempts: 0,
    row: 0,
    col: 0,
    over: true,
};

/* ==========================================================================
   Board
   ========================================================================== */

/**
 * Builds an empty board.
 * @param {number} rows - number of attempts
 * @param {number} columns - length of the word to find
 */
function createBoard(rows, columns) {
    boardEl.replaceChildren();
    boardEl.style.setProperty("--rows", rows);
    boardEl.style.setProperty("--cols", columns);

    for (let r = 0; r < rows; r++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let c = 0; c < columns; c++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.style.setProperty("--i", c); // used by CSS to stagger the reveal
            row.append(tile);
        }
        boardEl.append(row);
    }
}

/**
 * Returns a board row.
 * @param {number} rowIndex - index of the row
 * @returns {HTMLElement} the row
 */
function getRow(rowIndex) {
    return boardEl.children[rowIndex];
}

/**
 * Writes a letter in a tile, or clears it when the letter is empty.
 * @param {number} rowIndex - index of the row
 * @param {number} colIndex - index of the tile in the row
 * @param {string} letter - the letter, or "" to clear the tile
 */
function setLetter(rowIndex, colIndex, letter) {
    const tile = getRow(rowIndex).children[colIndex];
    tile.textContent = letter;
    if (letter) {
        tile.dataset.state = "filled";
    } else {
        delete tile.dataset.state;
    }
}

/**
 * Reads the word typed in a row.
 * @param {number} rowIndex - index of the row
 * @returns {string} the word
 */
function readRow(rowIndex) {
    return Array.from(getRow(rowIndex).children, (tile) => tile.textContent).join("");
}

/**
 * Colours the tiles of a row (the flip animation is handled by CSS).
 * @param {number} rowIndex - index of the row
 * @param {string[]} states - state of each letter
 */
function revealRow(rowIndex, states) {
    const tiles = getRow(rowIndex).children;
    states.forEach((state, i) => {
        tiles[i].dataset.state = state;
    });
}

/* ==========================================================================
   On-screen keyboard
   ========================================================================== */

/**
 * Builds the on-screen keyboard. Called once, when the page loads.
 */
function createKeyboard() {
    for (const keys of KEYBOARD_LAYOUT) {
        const row = document.createElement("div");
        row.className = "keyboard-row";
        for (const key of keys) {
            row.append(createKey(key));
        }
        keyboardEl.append(row);
    }
}

/**
 * Creates a keyboard key.
 * @param {string} key - the letter, "ENTER" or "BACKSPACE"
 * @returns {HTMLButtonElement} the key
 */
function createKey(key) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    button.dataset.key = key;
    button.tabIndex = -1; // physical keyboard users type directly
    if (key in SPECIAL_KEYS) {
        button.classList.add("key-wide");
        button.textContent = SPECIAL_KEYS[key].label;
        button.setAttribute("aria-label", SPECIAL_KEYS[key].ariaLabel);
    } else {
        button.textContent = key;
    }
    return button;
}

/**
 * Updates the colour of the keys used in a guess. A key never loses its best state.
 * @param {string} guess - the guessed word
 * @param {string[]} states - state of each letter
 */
function updateKeyboard(guess, states) {
    states.forEach((state, i) => {
        const key = keyboardEl.querySelector(`[data-key="${guess[i]}"]`);
        key.dataset.state = strongerState(key.dataset.state, state);
    });
}

/**
 * Removes every colour from the keyboard.
 */
function resetKeyboard() {
    for (const key of keyboardEl.querySelectorAll("[data-state]")) {
        delete key.dataset.state;
    }
}

/* ==========================================================================
   Game logic
   ========================================================================== */

/**
 * Handles a key coming from the physical or the on-screen keyboard.
 * @param {string} key - a letter (A–Z), "ENTER" or "BACKSPACE"
 */
function handleKey(key) {
    if (game.over) {
        return;
    }
    if (/^[A-Z]$/.test(key)) {
        addLetter(key);
    } else if (key === "BACKSPACE") {
        removeLetter();
    } else if (key === "ENTER") {
        submitGuess();
    }
}

/**
 * Adds a letter at the current position, if the row is not full.
 * @param {string} letter - the letter
 */
function addLetter(letter) {
    if (game.col < game.target.length) {
        setLetter(game.row, game.col, letter);
        game.col++;
    }
}

/**
 * Removes the last letter of the current row.
 */
function removeLetter() {
    if (game.col > 0) {
        game.col--;
        setLetter(game.row, game.col, "");
    }
}

/**
 * Validates the current row: checks the word, reveals the colours and ends the game if needed.
 */
function submitGuess() {
    const row = getRow(game.row);
    if (game.col < game.target.length) {
        shake(row);
        showToast("Pas assez de lettres");
        return;
    }

    const guess = readRow(game.row);
    if (!isWordInDictionary(guess)) {
        shake(row);
        showToast("Mot absent du dictionnaire");
        return;
    }

    const states = evaluateGuess(guess, game.target);
    revealRow(game.row, states);
    game.row++;
    game.col = 0;

    const won = guess === game.target;
    const finished = won || game.row === game.attempts;
    game.over = finished; // block input until the reveal ends when the game is over
    updateGameInfo();

    // Keyboard colours and end-of-game dialog wait for the flip animation.
    setTimeout(() => {
        updateKeyboard(guess, states);
        if (finished) {
            openResultDialog(won, game.target, game.row);
        }
    }, revealDuration(states.length));
}

/**
 * Shows the number of remaining attempts above the board.
 */
function updateGameInfo() {
    const left = game.attempts - game.row;
    const info = document.getElementById("game-info");
    info.textContent = `${game.target.length} lettres · ${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}`;
}

/**
 * Starts a new game and switches to the game screen.
 * @param {string} target - the word to find (upper case)
 * @param {number} attempts - number of allowed guesses
 */
function startGame(target, attempts) {
    Object.assign(game, {
        target,
        attempts,
        row: 0,
        col: 0,
        over: false,
    });
    createBoard(attempts, target.length);
    resetKeyboard();
    updateGameInfo();
    setupView.hidden = true;
    gameView.hidden = false;
}

/**
 * Goes back to the setup screen.
 */
function backToSetup() {
    game.over = true;
    closeResultDialog();
    setupForm.reset();
    setFormError("");
    gameView.hidden = true;
    setupView.hidden = false;
    document.getElementById("word").focus();
}

/* ==========================================================================
   Setup form
   ========================================================================== */

/**
 * Shows an error message under the form (an empty string hides it).
 * @param {string} message - the message
 */
function setFormError(message) {
    formError.textContent = message;
}

/**
 * Disables the form buttons while a dictionary is loading.
 * @param {boolean} busy - true while loading
 */
function setBusy(busy) {
    for (const button of setupForm.querySelectorAll("button")) {
        button.disabled = busy;
    }
}

/**
 * Returns a random integer between min and max (both included).
 * @param {number} min - lower bound
 * @param {number} max - upper bound
 * @returns {number} the random integer
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Validates the setup form, loads the matching dictionary and starts the game.
 * @param {SubmitEvent} event - the submit event
 */
async function handleSetupSubmit(event) {
    event.preventDefault();
    const data = new FormData(setupForm);
    const word = String(data.get("word")).trim()
        .toUpperCase();
    const attempts = Number(data.get("attempts"));

    if (!new RegExp(`^[A-Z]{${MIN_LENGTH},${MAX_LENGTH}}$`).test(word)) {
        setFormError(`Le mot doit contenir entre ${MIN_LENGTH} et ${MAX_LENGTH} lettres, sans accents.`);
        return;
    }
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
        setFormError("Le nombre de tentatives doit être compris entre 1 et 20.");
        return;
    }

    setFormError("");
    setBusy(true);
    try {
        await loadDictionary(word.length);
    } catch (error) {
        console.error(error);
        setFormError("Impossible de charger le dictionnaire. Vérifiez votre connexion et réessayez.");
        return;
    } finally {
        setBusy(false);
    }

    if (!isWordInDictionary(word)) {
        setFormError("Ce mot n'existe pas dans le dictionnaire.");
        return;
    }
    startGame(word, attempts);
}

/**
 * Picks a random word from a random dictionary and puts it in the setup form.
 */
async function fillRandomWord() {
    setFormError("");
    setBusy(true);
    try {
        const words = await loadDictionary(randomInt(MIN_LENGTH, MAX_LENGTH));
        document.getElementById("word").value = words[randomInt(0, words.length - 1)];
        showToast("Mot choisi, cliquez sur Jouer");
    } catch (error) {
        console.error(error);
        setFormError("Impossible de charger le dictionnaire. Vérifiez votre connexion et réessayez.");
    } finally {
        setBusy(false);
    }
}

/* ==========================================================================
   Event listeners
   ========================================================================== */

/**
 * Forwards physical keyboard input to the game.
 * @param {KeyboardEvent} event - the keydown event
 */
function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || gameView.hidden || resultDialog.open) {
        return; // keep browser shortcuts, form typing and dialog buttons untouched
    }
    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key) || key === "ENTER" || key === "BACKSPACE") {
        event.preventDefault(); // e.g. avoid Enter re-clicking a focused button
        handleKey(key);
    }
}

/**
 * Forwards clicks on the on-screen keyboard to the game.
 * @param {MouseEvent} event - the click event
 */
function handleKeyboardClick(event) {
    const key = event.target.closest(".key");
    if (key) {
        handleKey(key.dataset.key);
    }
}

createKeyboard();
document.addEventListener("keydown", handleKeydown);
keyboardEl.addEventListener("click", handleKeyboardClick);
setupForm.addEventListener("submit", handleSetupSubmit);
document.getElementById("random-btn").addEventListener("click", fillRandomWord);
document.getElementById("new-game-btn").addEventListener("click", backToSetup);
document.getElementById("replay-btn").addEventListener("click", backToSetup);
document.getElementById("close-btn").addEventListener("click", closeResultDialog);
