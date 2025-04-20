// js/features/frog.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import { showInfoModal } from '../modals/infoModal.js';
import { cancelSeerPeekMode } from './seer.js';
// --- ADDED IMPORTS ---
import { modifyPlayerScore } from '../player.js'; // To deduct score

// --- ADDED COST ---
const FROG_COST = 100;

export function activateFrogOfFate() {
    // --- AFFORDABILITY CHECK ---
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
        console.error("Frog of Fate: Cannot find current player.");
        return;
    }
    if (currentPlayer.score < FROG_COST) {
        showInfoModal("Not Enough Points!", `The Frog of Fate demands ${FROG_COST} points for its blessing, but you only have ${currentPlayer.score}.`);
        return; // Stop execution
    }
    // --- END CHECK ---

    // Prevent overlapping actions or use on empty board
    if (state.isFrogChoosing) return;
    if (state.isSeerPeeking) cancelSeerPeekMode();
    const unopenedChests = Array.from(document.querySelectorAll('.chest:not(.opened)'));
    if (unopenedChests.length === 0) {
        showInfoModal("Frog of Fate", "The Frog of Fate sighs... No unopened chests remain!");
        return;
    }

    // --- DEDUCT COST (BEFORE starting animation) ---
    modifyPlayerScore(state.currentPlayerIndex, -FROG_COST);
    console.log(`Player ${currentPlayer.name} paid ${FROG_COST} points for the Frog of Fate.`);
    // --- END DEDUCTION ---

    console.log(`Frog starting selection from ${unopenedChests.length} unopened chests.`);
    state.setFrogChoosing(true);
    if (DOM.frogOfFateImg) {
        DOM.frogOfFateImg.style.opacity = '0.5';
        DOM.frogOfFateImg.style.pointerEvents = 'none';
    }

    // --- Rest of the animation logic remains the same ---
    unopenedChests.forEach(chest => {
        chest.classList.remove('temp-frog-highlight', 'frog-final-choice-animation');
    });
    let highlightCount = 0;
    const maxHighlights = 18 + Math.floor(Math.random() * 15);
    const finalChosenChest = unopenedChests[Math.floor(Math.random() * unopenedChests.length)];
    const existingMultiplierBefore = state.getChestMultiplier(finalChosenChest);
    console.log(`Frog intends to choose:`, finalChosenChest, ` Existing Multiplier: ${existingMultiplierBefore}x`);

    function performHighlight() {
        // 1. Clear previous temporary highlight
        document.querySelectorAll('.temp-frog-highlight').forEach(el => {
            el.classList.remove('temp-frog-highlight');
        });

        // 2. Base Case: Animation finished
        if (highlightCount >= maxHighlights) {
            console.log("Frog animation finished. Applying selection to:", finalChosenChest);

            // --- APPLY THE ACTUAL FROG EFFECT ---
            // Ensure the chosen chest still exists and hasn't been opened during the animation
             const chestStillExistsAndUnopened = document.body.contains(finalChosenChest) && !finalChosenChest.classList.contains('opened');

            if (chestStillExistsAndUnopened) {
                let currentMultiplier = state.getChestMultiplier(finalChosenChest); // Get multiplier from state
                let newMultiplier = currentMultiplier === 0 || currentMultiplier === 1 ? 2 : Math.min(currentMultiplier * 2, 16); // Double, max 16x
                state.setChestMultiplier(finalChosenChest, newMultiplier); // Update state map

                console.log(`Chest multiplier updated to ${newMultiplier}x`);
                updateFrogChestVisuals(finalChosenChest, newMultiplier); // Apply final visuals

                // Add final pulse animation
                finalChosenChest.classList.add('frog-final-choice-animation');
                setTimeout(() => {
                    // Check if element still exists before removing class
                    if (document.body.contains(finalChosenChest)) {
                        finalChosenChest.classList.remove('frog-final-choice-animation');
                    }
                }, 600); // Match animation duration

            } else {
                 console.warn("Frog animation finished, but the chosen chest was opened or removed during the animation. No multiplier applied.");
            }
            // --- END FROG EFFECT ---


            // --- RESET STATE AND UI ---
            state.setFrogChoosing(false); // Reset flag using state function
            if (DOM.frogOfFateImg) {
                 DOM.frogOfFateImg.style.opacity = '1';
                 DOM.frogOfFateImg.style.pointerEvents = 'auto'; // Re-enable frog clicking
            }
            console.log("Frog selection complete.");
            // --- END RESET ---

            return; // End the recursion
        }

        // 3. Recursive Step: Highlight a random *currently* unopened chest
        const currentUnopenedAnim = Array.from(document.querySelectorAll('.chest:not(.opened)'));
        if (currentUnopenedAnim.length > 0) {
            const randomChestToHighlight = currentUnopenedAnim[Math.floor(Math.random() * currentUnopenedAnim.length)];
            // Add temporary highlight class
            if(randomChestToHighlight) { // Check if element exists
                 randomChestToHighlight.classList.add('temp-frog-highlight');
            }
        } else {
            // Optional: If no chests left, maybe end animation early?
            console.log("Frog animation: No more unopened chests during animation loop.");
            // Consider adding code here to stop early if desired, similar to base case reset.
        }

        // 4. Increment counter and schedule next step
        highlightCount++;
        const highlightDuration = 70 + Math.random() * 110; // Vary highlight speed
        setTimeout(performHighlight, highlightDuration);
    } // End of performHighlight function definition

    // Make sure this line is still present right after the function definition:
    performHighlight(); // Start the animation loop
}

// --- Visual Helper Functions ---

export function updateFrogChestVisuals(chestElement, multiplier) {
    if (!chestElement) return;
    removeFrogChestVisuals(chestElement); // Clear previous visuals first

    if (multiplier >= 2) {
        let highlightClass = 'frog-highlight-2x';
        let levelClass = 'level-1';
        if (multiplier >= 16) {
            highlightClass = 'frog-highlight-16x'; levelClass = 'level-4';
        } else if (multiplier >= 8) {
            highlightClass = 'frog-highlight-8x'; levelClass = 'level-3';
        } else if (multiplier >= 4) {
            highlightClass = 'frog-highlight-4x'; levelClass = 'level-2';
        }
        chestElement.classList.add(highlightClass);

        // Create and add multiplier text overlay
        const multiplierText = document.createElement('span');
        multiplierText.classList.add('frog-multiplier-text', levelClass);
        multiplierText.textContent = `${multiplier}x`;
        chestElement.appendChild(multiplierText);
    }
}

export function removeFrogChestVisuals(chestElement) {
    if (!chestElement) return;
    // Remove all possible frog-related classes
    chestElement.classList.remove(
        'frog-highlight-2x', 'frog-highlight-4x', 'frog-highlight-8x', 'frog-highlight-16x',
        'temp-frog-highlight', 'frog-final-choice-animation'
    );
    // Remove the multiplier text if it exists
    const existingMultiplierText = chestElement.querySelector('.frog-multiplier-text');
    if (existingMultiplierText) {
        existingMultiplierText.remove();
    }
}

export function clearAllFrogVisuals() {
     document.querySelectorAll('.chest').forEach(chest => {
         removeFrogChestVisuals(chest);
     });
}