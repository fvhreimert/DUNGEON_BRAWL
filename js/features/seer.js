// js/features/seer.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import { showInfoModal } from '../modals/infoModal.js';
import { closeSeerPeekModal } from '../modals/seerModal.js';
import { modifyPlayerScore } from '../player.js'; // To deduct score

const SEER_COST = 50;

export function handleMadSeerClick() {
    // --- AFFORDABILITY CHECK ---
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
        console.error("Mad Seer: Cannot find current player.");
        return;
    }
    if (currentPlayer.score < SEER_COST) {
        showInfoModal("Not Enough Points!", `The Mad Seer demands ${SEER_COST} points for a vision, but you only have ${currentPlayer.score}.`);
        return; // Stop execution
    }
    // --- END CHECK ---

    // Prevent overlapping actions or use on empty board
    if (state.isFrogChoosing || state.isSeerPeeking) return;
    const unopenedChestsCount = document.querySelectorAll('.chest:not(.opened)').length;
    if (unopenedChestsCount === 0) {
        showInfoModal("Mad Seer", "The Seer mutters incoherently... No unopened chests to peek at!");
        return;
    }

    // --- DEDUCT COST ---
    modifyPlayerScore(state.currentPlayerIndex, -SEER_COST);
    console.log(`Player ${currentPlayer.name} paid ${SEER_COST} points for the Mad Seer.`);
    // --- END DEDUCTION ---

    // --- Directly activate peek mode ---
    activateSeerPeekMode();
    // --- END activation ---
}

function activateSeerPeekMode() {
    console.log("Activating Seer Peek Mode");
    state.setSeerPeeking(true); // Set state flag
    state.setSeerPeekTargetChest(null); // Clear any previous target

    // Mark all unopened chests as available for peeking
    document.querySelectorAll('.chest:not(.opened)').forEach(chest => {
        chest.classList.add('seer-peek-available');
    });

    // Visually indicate Seer mode is active and disable other features
    if (DOM.madSeerImg) DOM.madSeerImg.style.filter = 'brightness(1.3) saturate(1.5)';
    if (DOM.cardJesterImg) DOM.cardJesterImg.style.pointerEvents = 'none';
    if (DOM.frogOfFateImg) DOM.frogOfFateImg.style.pointerEvents = 'none';
    if (DOM.sacrificialGobletImg) DOM.sacrificialGobletImg.style.pointerEvents = 'none';
    DOM.body.classList.add('seer-mode-active');
}

export function cancelSeerPeekMode() {
    if (!state.isSeerPeeking) return; // Only cancel if active

    console.log("Cancelling Seer Peek Mode");
    state.setSeerPeeking(false); // Reset state flag
    state.setSeerPeekTargetChest(null); // Clear target

    // Remove peek available class from all chests
    document.querySelectorAll('.chest.seer-peek-available').forEach(chest => {
        chest.classList.remove('seer-peek-available');
    });

    // Restore normal visuals and re-enable other features
    if (DOM.madSeerImg) DOM.madSeerImg.style.filter = 'none';
    if (DOM.cardJesterImg) DOM.cardJesterImg.style.pointerEvents = 'auto';
    if (DOM.frogOfFateImg) DOM.frogOfFateImg.style.pointerEvents = 'auto';
    if (DOM.sacrificialGobletImg) DOM.sacrificialGobletImg.style.pointerEvents = 'auto';
    DOM.body.classList.remove('seer-mode-active');
    closeSeerPeekModal();
}