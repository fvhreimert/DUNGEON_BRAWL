// js/modals/confirmModal.js
import * as DOM from '../domElements.js';

let onConfirmCallback = null;
let onCancelCallback = null;

// --- Get Modal Elements ---
const confirmModal = DOM.getElement('#confirm-modal');
const confirmModalTitle = DOM.getElement('#confirm-modal-title');
const confirmModalText = DOM.getElement('#confirm-modal-text');
const confirmYesBtn = DOM.getElement('#confirm-modal-yes-btn');
const confirmNoBtn = DOM.getElement('#confirm-modal-no-btn');
const confirmModalContent = DOM.getElement('.confirm-content'); // For stopPropagation


export function showConfirmationModal(title, text, onConfirm, onCancel = null) {
    if (!confirmModal || !confirmModalTitle || !confirmModalText || !confirmYesBtn || !confirmNoBtn) {
        console.error("Cannot show confirmation modal: Elements missing.");
        // Fallback to window.confirm if modal elements are broken
        if (window.confirm(text)) {
            if (typeof onConfirm === 'function') onConfirm();
        } else {
            if (typeof onCancel === 'function') onCancel();
        }
        return;
    }

    confirmModalTitle.textContent = title;
    confirmModalText.textContent = text;
    onConfirmCallback = onConfirm; // Store the function to call if 'Yes' is clicked
    onCancelCallback = onCancel;   // Store the function to call if 'No' is clicked

    confirmModal.style.display = 'flex';
    confirmYesBtn.focus(); // Focus 'Yes' by default
}

function handleConfirmYes() {
    console.log("[Confirm Modal Yes] Checking onConfirmCallback. Type is:", typeof onConfirmCallback);

    // closeConfirmationModal(); // <<<< TEMPORARILY COMMENT THIS OUT

    if (typeof onConfirmCallback === 'function') {
        try {
            console.log("[Confirm Modal] Executing onConfirmCallback...");
            onConfirmCallback(); // Execute the stored 'Yes' action
            console.log("[Confirm Modal] onConfirmCallback finished.");
            // Manually close AFTER execution if it worked
            closeConfirmationModal(); // <<<< MOVE CLOSE HERE (inside the 'if')
        } catch (error) {
            console.error("[Confirm Modal] Error executing confirmation 'Yes' callback:", error);
             // Close even on error? Maybe.
             closeConfirmationModal();
        }
    } else {
        console.warn("[Confirm Modal Yes] No valid onConfirmCallback was stored when 'Yes' was clicked.");
        // Close if no callback was found
        closeConfirmationModal();
    }
    // --- REMOVE CLEARING FROM HERE (Now handled in closeConfirmationModal) ---
    // onConfirmCallback = null;
    // onCancelCallback = null;
}

function handleConfirmNo() {
    closeConfirmationModal(); // Close the modal first
    if (typeof onCancelCallback === 'function') {
        try {
            onCancelCallback(); // Execute the stored 'No' action (optional)
        } catch (error) {
            console.error("Error executing confirmation 'No' callback:", error);
        }
    }
     // Clear callbacks after execution
    onConfirmCallback = null;
    onCancelCallback = null;
}

export function closeConfirmationModal() {
    if (confirmModal) {
        confirmModal.style.display = 'none';
    }
     // Clear callbacks just in case it's closed externally
     onConfirmCallback = null;
     onCancelCallback = null;
}

// --- Setup Listeners (Call this from main.js) ---
export function setupConfirmModalListeners() {
     if (!confirmModal) return; // Don't setup if modal doesn't exist

     if (confirmYesBtn) confirmYesBtn.addEventListener('click', handleConfirmYes);
     else console.warn("Listener not added: Confirm Yes Btn missing.");

     if (confirmNoBtn) confirmNoBtn.addEventListener('click', handleConfirmNo);
     else console.warn("Listener not added: Confirm No Btn missing.");

     // Prevent background click from closing (user MUST choose Yes/No)
     confirmModal.addEventListener('click', (event) => {
         // Optional: allow background click to act like 'No'? Generally not recommended for confirmations.
         // if (event.target === confirmModal) handleConfirmNo();
     });
     // Prevent clicks inside content from doing anything unintended
     if(confirmModalContent) confirmModalContent.addEventListener('click', (e) => e.stopPropagation());
}