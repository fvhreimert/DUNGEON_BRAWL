// js/main.js
import * as DOM from './domElements.js';
import * as state from './state.js';
import { startSetup } from './setup.js';
import { createBoard } from './board.js';
import { createPlayerDisplays, updateTurnIndicator } from './player.js';
import { setupInfoModalListeners } from './modals/infoModal.js';
import { setupCardModalListeners } from './modals/cardModal.js';
import { setupPlayerSelectModalListeners } from './modals/playerSelectModal.js';
import { setupQuestionModalListeners } from './modals/questionModal.js';
import { setupSeerModalListeners } from './modals/seerModal.js';
import { activateFrogOfFate, clearAllFrogVisuals } from './features/frog.js';
import { handleMadSeerClick } from './features/seer.js'; // <--- Changed import name
import { handleDrawCard } from './features/cardJester.js';
import { setupGobletModalListeners, handleSacrificialGoblet } from './features/goblet.js';
import { setupInventoryModalListeners } from './modals/inventoryModal.js';
import { setupRouletteModalListeners } from './modals/rouletteModal.js';
import { setupTreasureMapModalListeners } from './modals/treasureMapModal.js';
import { setupCategorySelectModalListeners } from './modals/categorySelectModal.js';
import { setupConfirmModalListeners } from './modals/confirmModal.js';

// --- Game Initialization Function ---
function initializeGame() {
    console.log("Initializing game...");

    // Reset state variables (ensure clean slate)
    state.clearFrogMultipliers();
    state.setFrogChoosing(false);
    state.setSeerPeeking(false);
    state.setSeerPeekTargetChest(null);
    state.resetCurrentQuestionParams();

    // Reset visuals
    document.querySelectorAll('.chest').forEach(chest => {
        chest.classList.remove('opened', 'seer-peek-available');
        const img = chest.querySelector('img');
        if (img) img.src = 'images/treasure_chest.png';
    });
    clearAllFrogVisuals(); // Clear frog highlights/text
    if (DOM.frogOfFateImg) {
        DOM.frogOfFateImg.style.opacity = '1';
        DOM.frogOfFateImg.style.pointerEvents = 'auto';
    }
    if (DOM.madSeerImg) DOM.madSeerImg.style.filter = 'none';

    // Check core elements before proceeding
    if (!DOM.questionsGrid || !DOM.categoriesContainer || !DOM.playerCardsContainer) {
        console.error("Cannot initialize game fully: Board/Player elements missing.");
        // Maybe show an error to the user?
        return;
    }

    // Build the UI based on current state
    createBoard(); // Creates categories and chests
    createPlayerDisplays(); // Creates player cards based on state.players
    updateTurnIndicator(); // Highlights the first player

    // Attach event listeners for game interactions (modals, side icons)
    addCoreGameEventListeners();

    console.log("Game Initialized.");
}

// --- Setup Core Event Listeners ---
function addCoreGameEventListeners() {
    console.log("Adding CORE game event listeners...");

    // Setup listeners for all modal types
    setupInfoModalListeners();
    setupCardModalListeners();
    setupPlayerSelectModalListeners();
    setupQuestionModalListeners();
    setupSeerModalListeners();
    setupGobletModalListeners();
    setupInventoryModalListeners();
    setupRouletteModalListeners();
    setupTreasureMapModalListeners();
    setupConfirmModalListeners();
    setupCategorySelectModalListeners();

    // Setup listeners for Side Icons (Features)
    if (DOM.cardJesterImg) DOM.cardJesterImg.addEventListener('click', handleDrawCard);
    else console.warn("Listener not added: Card Jester Img not found");

    if (DOM.frogOfFateImg) DOM.frogOfFateImg.addEventListener('click', activateFrogOfFate);
    else console.warn("Listener not added: Frog of Fate Img not found");

    if (DOM.madSeerImg) { // <--- Changed DOM element reference
        DOM.madSeerImg.addEventListener('click', handleMadSeerClick); // <--- Changed function name and DOM reference
    } else {
        console.error("Initialization Error: Mad Seer image element not found.");
    }

    if (DOM.sacrificialGobletImg) DOM.sacrificialGobletImg.addEventListener('click', handleSacrificialGoblet);
    else console.warn("Listener not added: Sacrificial Goblet Img not found");

    // Note: Chest click listeners are added in board.js when chests are created.
    // Note: Player card click listeners (for turn change/score) are added in player.js.
}


// --- Application Start ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Start the setup process, passing initializeGame as the callback
    // This ensures the game only initializes AFTER setup is successfully completed.
    startSetup(initializeGame);

});