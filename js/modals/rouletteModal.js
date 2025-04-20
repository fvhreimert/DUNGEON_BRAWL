// js/modals/rouletteModal.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import { modifyPlayerScore, updatePlayerInventoryDisplay } from '../player.js';
import { showInfoModal } from './infoModal.js';
import { showError } from '../utils.js'; // Import showError

let currentRoulettePlayerIndex = -1;

// --- ADD export HERE ---
export function showRouletteModal(playerIndex) {
    if (!DOM.rouletteModal || !DOM.rouletteAmountSlider || !DOM.rouletteAmountDisplay || !DOM.rouletteError) {
        console.error("Cannot show Roulette modal: Required elements missing.");
        return;
    }

    currentRoulettePlayerIndex = playerIndex;
    const player = state.players[playerIndex];
    if (!player) {
        console.error("Roulette: Cannot find player", playerIndex);
        currentRoulettePlayerIndex = -1;
        return;
    }

    // Reset UI
    DOM.rouletteAmountSlider.value = 100; // Default wager
    DOM.rouletteAmountDisplay.textContent = 100;
    DOM.rouletteError.style.display = 'none'; // Hide error message

    DOM.rouletteModal.style.display = 'flex';
}

function handleGamble() {
    if (currentRoulettePlayerIndex < 0) {
        console.error("Roulette Gamble Error: No player index stored.");
        closeRouletteModal();
        return;
    }

    const playerIndex = currentRoulettePlayerIndex;
    const player = state.players[playerIndex];
    if (!player) {
        console.error("Roulette Gamble Error: Player not found for index", playerIndex);
        closeRouletteModal();
        return;
    }

     if (!DOM.rouletteAmountSlider || !DOM.rouletteError) {
         console.error("Roulette Gamble Error: Slider or Error element missing.");
         closeRouletteModal();
         return;
    }


    const amountToGamble = parseInt(DOM.rouletteAmountSlider.value);

    // --- Affordability Check (can they afford to LOSE?) ---
    if (amountToGamble < 0) {
        showError("Cannot gamble a negative amount.", DOM.rouletteError);
        return;
    }
    if (amountToGamble === 0) {
         showError("You must gamble more than 0 points!", DOM.rouletteError);
         return;
    }
    if (player.score < amountToGamble) {
        showError(`You only have ${player.score} points, you can't afford to lose ${amountToGamble}! Lower your wager.`, DOM.rouletteError);
        return;
    }
    // Hide error if checks pass
    DOM.rouletteError.style.display = 'none';


    // --- Perform Gamble ---
    const win = Math.random() < 0.5; // 50% chance

    let outcomeMessage = "";
    let scoreChange = 0;

    if (win) {
        scoreChange = amountToGamble; // Gain the amount gambled
        outcomeMessage = `Congratulations! You won ${scoreChange} points!`;
        console.log(`Player ${playerIndex} won roulette: +${scoreChange}`);
    } else {
        scoreChange = -amountToGamble; // Lose the amount gambled
        outcomeMessage = `Unlucky! You lost ${amountToGamble} points!`;
         console.log(`Player ${playerIndex} lost roulette: ${scoreChange}`);
    }

    // Apply score change
    modifyPlayerScore(playerIndex, scoreChange);

    // Consume card
    const cardRemoved = state.removeCardFromPlayerInventory(playerIndex, 'roulette.png');
    if (cardRemoved) {
        updatePlayerInventoryDisplay(playerIndex); // Update player card inventory visual
    }

    // Close this modal and show result
    closeRouletteModal();
    showInfoModal("Roulette Result", outcomeMessage);
}

export function closeRouletteModal() {
    if (DOM.rouletteModal) {
        DOM.rouletteModal.style.display = 'none';
    }
     if (DOM.rouletteError) DOM.rouletteError.style.display = 'none'; // Hide error on close
    currentRoulettePlayerIndex = -1; // Reset player index
}

// Setup listeners for the roulette modal
export function setupRouletteModalListeners() {
     if (!DOM.rouletteModal) return; // Don't try if modal doesn't exist

    if (DOM.rouletteCloseBtn) {
        DOM.rouletteCloseBtn.addEventListener('click', closeRouletteModal);
    } else console.warn("Listener not added: Roulette Close Btn missing.");

    if (DOM.rouletteAmountSlider && DOM.rouletteAmountDisplay) {
        DOM.rouletteAmountSlider.addEventListener('input', function() {
            DOM.rouletteAmountDisplay.textContent = this.value;
            if (DOM.rouletteError) DOM.rouletteError.style.display = 'none'; // Hide error on slider change
        });
    } else console.warn("Listeners for Roulette slider/display not added.");

    if (DOM.rouletteGambleBtn) {
        DOM.rouletteGambleBtn.addEventListener('click', handleGamble);
    } else console.warn("Listener not added: Roulette Gamble Btn missing.");

    // Background click
    DOM.rouletteModal.addEventListener('click', (event) => {
        if (event.target === DOM.rouletteModal) closeRouletteModal();
    });
     // Prevent content click from closing
    if(DOM.rouletteModalContent) {
         DOM.rouletteModalContent.addEventListener('click', (e) => e.stopPropagation());
    }
}