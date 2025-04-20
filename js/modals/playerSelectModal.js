// js/modals/playerSelectModal.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import { showError } from '../utils.js';

// --- Module-level variable to store the callback ---
let onPlayerSelectedCallback = null;

// --- Function to show the modal ---
// Takes the function to call upon selection as an argument
export function prepareAndShowPlayerSelectModal(callback) {
    // Ensure essential DOM elements are available
    if (!DOM.playerSelectList || !DOM.playerSelectError || !DOM.playerSelectModal || !DOM.playerSelectModalContent) {
        console.error("Cannot prepare player select modal: Essential elements missing.");
        return;
    }
    // Get the title element (assuming it's an H2 inside the modal content)
    const modalTitle = DOM.playerSelectModalContent.querySelector('h2');

    console.log("[PlayerSelectModal] Preparing modal. Callback received:", typeof callback);

    // Validate and store the callback
    if (typeof callback !== 'function') {
         console.error("Player Select Modal requires a valid callback function.");
         return;
    }
    onPlayerSelectedCallback = callback;

    // --- Set the static title ---
    if (modalTitle) {
        modalTitle.textContent = "Choose Victim"; // Static title
    } else {
        console.warn("Player Select Modal title element (h2) not found.");
    }

    // Clear previous state and list
    DOM.playerSelectList.innerHTML = '';
    DOM.playerSelectError.style.display = 'none';

    // Populate list with potential victims (not self, not coalition partner)
    let potentialVictims = 0;
    const userIndex = state.currentPlayerIndex; // Assume current player is the one initiating

    state.players.forEach((player, index) => {
        // Check if the player is not the user and not in a coalition with the user
        if (index !== userIndex && !state.isInCoalitionWith(userIndex, index)) {
            const playerButton = document.createElement('button');
            playerButton.textContent = player.name;
            playerButton.dataset.targetIndex = index;
            DOM.playerSelectList.appendChild(playerButton);
            potentialVictims++;
        }
    });

    // Show modal only if there are valid targets
    if (potentialVictims > 0) {
        DOM.playerSelectModal.style.display = 'flex';
    } else {
        console.log("[PlayerSelectModal] No potential non-coalition victims found.");
        // Optionally show an info modal instead of using the error field
        showInfoModal("No Targets", "No valid targets available (everyone else might be in your coalition or unavailable).");
        // showError("No valid targets available.", DOM.playerSelectError); // Alternative
        // closePlayerSelectModal(); // Close immediately if no targets
    }
}

// --- Handler for clicking a player button ---
function handleGobletTargetSelect(event) {
    // Ensure click is on a BUTTON directly within the list
    if (event.target.tagName !== 'BUTTON' || !event.target.closest('#player-select-list')) {
        return;
    }

    const targetIndex = parseInt(event.target.dataset.targetIndex);
    console.log("[PlayerSelectModal] Button clicked for targetIndex:", targetIndex); // Log click

    if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < state.players.length) {
        if (targetIndex === state.currentPlayerIndex) {
            showError("Cannot choose yourself!", DOM.playerSelectError);
            return;
        }

        // *** EXECUTE THE STORED CALLBACK ***
        console.log("[PlayerSelectModal] Checking stored callback:", typeof onPlayerSelectedCallback); // Log type before calling
        if (typeof onPlayerSelectedCallback === 'function') {
            try {
                // Call the function that was passed in (should be handleVictimSelection)
                onPlayerSelectedCallback(targetIndex);
                 console.log("[PlayerSelectModal] Callback executed successfully."); // Log success
            } catch (error) {
                console.error("[PlayerSelectModal] Error executing player select callback:", error);
            }
        } else {
            // This is the warning you were seeing!
            console.warn("[PlayerSelectModal] No callback function defined or stored for player selection.");
        }

        // Clear callback *after* potential execution (or maybe clear it in close modal?)
        // onPlayerSelectedCallback = null; // Let close modal handle clearing

        // Close the modal AFTER handling the click and callback
        closePlayerSelectModal();

    } else {
        console.error("[PlayerSelectModal] Invalid target index:", event.target.dataset.targetIndex);
        showError("Invalid player selected.", DOM.playerSelectError);
    }
}

// --- Function to close the modal ---
export function closePlayerSelectModal() {
    if (DOM.playerSelectModal) DOM.playerSelectModal.style.display = 'none';
    if (DOM.playerSelectList) DOM.playerSelectList.innerHTML = ''; // Clear list
    if (DOM.playerSelectError) DOM.playerSelectError.style.display = 'none';

    // *** Clear the callback when the modal is closed ***
    console.log("[PlayerSelectModal] Closing modal, clearing callback."); // Log clear
    onPlayerSelectedCallback = null;
}

// --- Setup Listeners (called once from main.js) ---
export function setupPlayerSelectModalListeners() {
     if (DOM.playerSelectCloseBtn) {
        DOM.playerSelectCloseBtn.addEventListener('click', closePlayerSelectModal);
     } else console.warn("Listener not added: Player Select Close Btn not found");

     if (DOM.playerSelectModal) {
         // Close on background click
         DOM.playerSelectModal.addEventListener('click', (event) => {
             if (event.target === DOM.playerSelectModal) closePlayerSelectModal();
         });
         // Prevent content click from closing
         if(DOM.playerSelectModalContent) DOM.playerSelectModalContent.addEventListener('click', (e) => e.stopPropagation());

         // Attach the selection handler to the LIST container using event delegation
         if(DOM.playerSelectList) {
            DOM.playerSelectList.addEventListener('click', handleGobletTargetSelect);
         } else console.warn("Listener not added: Player Select List not found");

     } else console.warn("Listeners not added: Player Select Modal not found");
}