// js/features/goblet.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import { showInfoModal } from '../modals/infoModal.js';
import { prepareAndShowPlayerSelectModal, closePlayerSelectModal } from '../modals/playerSelectModal.js';
import { modifyPlayerScore } from '../player.js';
import { cancelSeerPeekMode } from './seer.js';

let chosenGobletPenalty = 0;
let gobletUserIndex = -1;

// --- Main Function Triggered by Icon Click ---
export function handleSacrificialGoblet() {
    if (state.isFrogChoosing) return;
    if (state.isSeerPeeking) cancelSeerPeekMode();

    if (state.players.length < 2) {
        showInfoModal("Sacrificial Goblet", "The goblet thirsts, but needs at least two souls for its dark ritual!");
        return;
    }
    showGobletInputModal();
}

// --- Goblet Input Modal Functions ---
function showGobletInputModal() {
    if (!DOM.gobletInputModal || !DOM.gobletAmountSlider || !DOM.gobletAmountDisplay) {
        console.error("Cannot show Goblet Input Modal: Elements missing.");
        return;
    }
    DOM.gobletAmountSlider.value = 100; // Reset slider default
    DOM.gobletAmountDisplay.textContent = 100;
    DOM.gobletInputModal.style.display = 'flex';
}

// --- Listener Setup Function (Called once from main.js) ---
export function setupGobletModalListeners() {
    if (!DOM.gobletInputModal) {
        console.warn("Goblet Input Modal element not found, cannot set up listeners.");
        return;
    }
    if (DOM.gobletAcceptBtn) {
        DOM.gobletAcceptBtn.addEventListener('click', handleGobletAccept); // Changed assignment to addEventListener
    } else console.warn("Listener not added: Goblet Accept Btn missing.");
    if (DOM.gobletInputCloseBtn) {
        DOM.gobletInputCloseBtn.addEventListener('click', closeGobletInputModal); // Changed assignment to addEventListener
    } else console.warn("Listener not added: Goblet Input Close Btn missing.");
    DOM.gobletInputModal.addEventListener('click', (event) => {
        if (event.target === DOM.gobletInputModal) closeGobletInputModal();
    });
    if (DOM.gobletInputContent) {
        DOM.gobletInputContent.addEventListener('click', (e) => e.stopPropagation());
    }
    if (DOM.gobletAmountSlider && DOM.gobletAmountDisplay) {
        DOM.gobletAmountSlider.addEventListener('input', function() {
            DOM.gobletAmountDisplay.textContent = this.value;
        });
    } else {
        console.warn("Listeners for Goblet slider/display not added: Elements missing.");
    }
}

function closeGobletInputModal() {
    if (DOM.gobletInputModal) {
        DOM.gobletInputModal.style.display = 'none';
    }
}

// --- MODIFIED: Called when 'Accept Penalty & Choose Victim' is clicked ---
function handleGobletAccept() {
    if (!DOM.gobletAmountSlider) {
        console.error("Goblet slider not found.");
        return;
    }
    gobletUserIndex = state.currentPlayerIndex;
    // 1. Get chosen penalty and current player info
    chosenGobletPenalty = parseInt(DOM.gobletAmountSlider.value) || 0;
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!currentPlayer) {
        console.error("Cannot accept goblet penalty: Current player not found.");
        closeGobletInputModal(); // Close modal to prevent further interaction
        return;
    }
    const currentPlayerScore = currentPlayer.score;

    // 2. --- AFFORDABILITY CHECK ---
    if (chosenGobletPenalty > currentPlayerScore) {
        showInfoModal(
            "Not Enough Points!",
            `You cannot sacrifice ${chosenGobletPenalty} points when you only have ${currentPlayerScore}. Choose a lower amount.`
        );
        // DO NOT close the modal, let the player adjust
        return; // Stop execution here
    }
    // --- END AFFORDABILITY CHECK ---


    // 3. Penalty is affordable (or zero), proceed
    const penaltyAmount = -chosenGobletPenalty; // Make it negative for score modification

    // Close the input modal *now* that the choice is valid
    closeGobletInputModal();

    // 4. Handle the zero penalty case
    if (chosenGobletPenalty <= 0) {
        showInfoModal("Goblet Sated?", "You chose to sacrifice nothing... the Goblet grumbles but lets you pass.");
        chosenGobletPenalty = 0; // Ensure it's reset
        return; // Stop here, no victim selection needed
    }

    // 5. Apply penalty to the CURRENT player immediately
    modifyPlayerScore(state.currentPlayerIndex, penaltyAmount);
    console.log(`Applied ${penaltyAmount} points penalty to player ${state.currentPlayerIndex} (${currentPlayer.name})`);

    // 6. Prepare and show the player select modal for victim choice
    //    Pass the callback function `handleVictimSelection`
    prepareAndShowPlayerSelectModal(handleVictimSelection);
}

// --- Victim Selection Handling (Callback for PlayerSelectModal) ---
function handleVictimSelection(targetIndex) {
    console.log(`--- Goblet Victim Selection Start ---`);
    const userIndex = gobletUserIndex; // <-- RETRIEVE USER INDEX
    gobletUserIndex = -1; // <-- RESET user index context
    chosenGobletPenalty = chosenGobletPenalty || 0; // Ensure penalty isn't NaN

    // Validate indices
    if (userIndex < 0) {
         console.error("[Goblet Victim Selection] Invalid user index stored.", userIndex);
         chosenGobletPenalty = 0; // Reset penalty
         return;
    }
     if (targetIndex < 0 || targetIndex >= state.players.length) {
         console.error("[Goblet Victim Selection] Invalid target index received.", targetIndex);
         chosenGobletPenalty = 0; // Reset penalty
         return;
     }
     if (userIndex === targetIndex) {
         console.error("[Goblet Victim Selection] Target index cannot be the same as user index (should be prevented by player select modal).", targetIndex);
          chosenGobletPenalty = 0; // Reset penalty
         return;
     }

    const targetPlayer = state.players[targetIndex];
    if (!targetPlayer) {
        console.error(`[Goblet Victim Selection] Target player object not found for index ${targetIndex}.`);
        chosenGobletPenalty = 0; // Reset stored penalty anyway
        return;
    }
    const targetPlayerName = targetPlayer.name || `Player ${targetIndex + 1}`;

    // *** ADD COALITION CHECK ***
    if (state.isInCoalitionWith(userIndex, targetIndex)) {
        showInfoModal("Coalition Pact!", `The Sacrificial Goblet cannot curse your coalition partner, ${targetPlayerName}!`);
        // User already paid their points. Victim is spared.
        chosenGobletPenalty = 0; // Reset stored penalty
        return; // Stop the effect on the victim
    }
    // *** END CHECK ***

    // --- Original Effect Logic ---
    const currentChosenPenalty = chosenGobletPenalty; // Capture the value
    const penaltyAmount = -currentChosenPenalty; // Calculate negative amount

    console.log(`[Goblet Victim Selection] Stored Penalty: ${currentChosenPenalty}, Calculated Amount: ${penaltyAmount}`);
    console.log(`[Goblet Victim Selection] Victim Name: ${targetPlayerName}`);

    // Make sure penaltyAmount is valid before proceeding
    if (isNaN(penaltyAmount) || currentChosenPenalty <= 0) {
        console.error("[Goblet Victim Selection] Invalid penalty amount derived. Aborting victim penalty.", penaltyAmount, "chosen:", currentChosenPenalty);
        chosenGobletPenalty = 0; // Reset stored penalty
        return;
    }

    // Show confirmation modal for the victim
    showInfoModal(
        "Curse Strikes!",
        `${targetPlayerName} feels a chilling dread as the curse takes hold... They lose ${currentChosenPenalty} points!`,
        () => {
            // This code runs *after* the "Curse Strikes!" modal's OK button is clicked
            console.log(`--- Goblet Victim Modal Callback Start ---`);
            console.log(`[Goblet Victim Callback] Preparing to modify score for index ${targetIndex} by ${penaltyAmount}`);

            try {
                modifyPlayerScore(targetIndex, penaltyAmount); // Apply the SAME penalty to the VICTIM
                console.log(`[Goblet Victim Callback] modifyPlayerScore called successfully for index ${targetIndex}.`);
            } catch (error) {
                console.error(`[Goblet Victim Callback] Error calling modifyPlayerScore for index ${targetIndex}:`, error);
            }

            console.log(`[Goblet Victim Callback] Resetting chosenGobletPenalty from ${chosenGobletPenalty} to 0.`);
            chosenGobletPenalty = 0; // Reset stored penalty *after* use
            console.log(`--- Goblet Victim Modal Callback End ---`);
        }
    );
    console.log(`--- Goblet Victim Selection End (Modal Shown) ---`);
}