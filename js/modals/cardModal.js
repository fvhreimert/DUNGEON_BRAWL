// js/modals/cardModal.js
import * as DOM from '../domElements.js';
import { buildCardElement } from '../utils.js';
// --- Import Event Handlers from cardJester.js ---
// Note: This creates a slight dependency loop, which is generally okay for UI handlers.
// If it causes issues (like load order problems), we might need to move event handlers to a separate file.
import { handlePimpEvent, handlePlagueEvent } from '../features/cardJester.js';

// --- State variable within this module ---
let pendingEventFunction = null; // Stores the event function to call on close
let currentCardType = null; // Store the type of the card currently shown


export function showCard(cardObject, isShiny = false) { // Accept isShiny parameter
    if (!DOM.cardModal || !DOM.cardImageContainer) {
        console.error("Cannot show card: Card Modal or Container missing.");
        return;
    }
    if (!cardObject) {
         console.error("Cannot show card: Invalid cardObject data provided.");
          // Optionally display an error card visual
          DOM.cardImageContainer.innerHTML = '<p style="color: red; text-align: center;">Error loading card data!</p>';
          DOM.cardModal.style.display = 'flex';
        return;
    }

    DOM.cardImageContainer.innerHTML = '';
    pendingEventFunction = null;
    currentCardType = null;

    // *** Pass isShiny status to buildCardElement ***
    const cardElement = buildCardElement(cardObject, { isShiny: isShiny }); // Build with shiny status
    DOM.cardImageContainer.appendChild(cardElement);

    currentCardType = cardObject.type;
    if (cardObject.type === 'Event') {
        if (cardObject.filename === 'pimp.png') {
            pendingEventFunction = handlePimpEvent;
        } else if (cardObject.filename === 'plague.png') {
            pendingEventFunction = handlePlagueEvent;
        }
        console.log(`Card Modal: Pending Event stored for ${cardObject.filename}.`);
    }

    DOM.cardModal.style.display = 'flex';
}


// --- MODIFIED closeCardModal ---
export function closeCardModal() {
    if (DOM.cardModal) DOM.cardModal.style.display = 'none';
    if (DOM.cardImageContainer) DOM.cardImageContainer.innerHTML = "";

    // --- Execute Pending Event AFTER closing ---
    if (typeof pendingEventFunction === 'function') {
        console.log("Card Modal Closed: Executing pending event.");
        try {
            // Execute the stored function (handlePimpEvent or handlePlagueEvent)
            pendingEventFunction();
        } catch (error) {
            console.error("Error executing pending event function:", error);
        }
    } else {
        // console.log("Card Modal Closed: No pending event.");
    }
    // --- End Execute Pending Event ---

    // Clear the stored function and type regardless
    pendingEventFunction = null;
    currentCardType = null;
}

// --- MODIFIED setupCardModalListeners ---
export function setupCardModalListeners() {
     if (!DOM.cardImageContainer) {
          console.warn("Card Image Container not found...");
     }
     if (DOM.cardCloseBtn) {
         // Make sure the close button ALSO triggers the event check
         DOM.cardCloseBtn.addEventListener('click', closeCardModal); // Use the updated close function
     }
     else console.warn("Listener not added: Card Close Btn not found");

     if (DOM.cardModal) {
        DOM.cardModal.addEventListener('click', (event) => {
            // Only close if clicking directly on the modal background
             if (event.target === DOM.cardModal) {
                 closeCardModal(); // Use the updated close function
             }
        });
         // Prevent clicks *inside* the card container from closing
         if(DOM.cardImageContainer) {
             DOM.cardImageContainer.addEventListener('click', (e) => e.stopPropagation());
         }
     } else console.warn("Listeners not added: Card Modal not found");
}
