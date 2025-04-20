// js/modals/seerModal.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
// Import necessary actions from other modules
import { handleChestClick } from '../board.js';
import { cancelSeerPeekMode } from '../features/seer.js'; // May need this if reject cancels

export function showSeerPeekModalContent(questionText) {
    if (!DOM.seerPeekWords || !DOM.seerPeekModal || !DOM.seerAcceptBtn) {
        console.error("Cannot show seer content: Modal elements missing.");
        return;
    }

    // Word processing logic (simplified, keep as is for now)
    const words = questionText.split(/[\s-]+/);
    const commonWords = new Set(['a', 'an', 'the', 'is', 'of', 'in', 'it', 'and', 'or', 'what', 'who', 'where', 'when', 'why', 'how', 'are', 'this', 'that', 'for', 'on', 'to', 'from']);
    const filteredWords = words.map(word => word.replace(/[?,."';:!]/g, '').toLowerCase()).filter(word => word.length > 2 && !commonWords.has(word) && word !== '');
    for (let i = filteredWords.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[filteredWords[i], filteredWords[j]] = [filteredWords[j], filteredWords[i]]; }
    const peekWords = filteredWords.slice(0, 4);

    if (peekWords.length > 0) {
        DOM.seerPeekWords.innerHTML = '';
        peekWords.forEach(word => {
            const span = document.createElement('span');
            span.textContent = word;
            DOM.seerPeekWords.appendChild(span);
        });
    } else {
        DOM.seerPeekWords.textContent = "(Visions too chaotic!)";
    }

    DOM.seerPeekModal.style.display = 'flex';
    DOM.seerAcceptBtn.focus(); // Focus the accept button
}

export function handleSeerAccept() {
    const chestToOpen = state.seerPeekTargetChest; // Get target from state
    if (!chestToOpen) {
        console.error("Seer Accept Error: No target chest stored in state.");
        closeSeerPeekModal();
        cancelSeerPeekMode(); // Ensure Seer mode is fully cancelled
        return;
    }

    closeSeerPeekModal();
    cancelSeerPeekMode(); // This function should handle resetting state and visuals

    console.log("Seer accepted, triggering open for:", chestToOpen);
    // Directly simulate the click event object structure expected by handleChestClick
    handleChestClick({ currentTarget: chestToOpen });
}

export function handleSeerReject() {
    console.log("Seer rejected, cancelling Seer Peek Mode.");
    cancelSeerPeekMode(); // Call the main cancel function
    // Optionally focus the main game area if needed
    if (DOM.mainGameArea) DOM.mainGameArea.focus();
}

export function closeSeerPeekModal() {
    if (DOM.seerPeekModal) DOM.seerPeekModal.style.display = 'none';
    if (DOM.seerPeekWords) DOM.seerPeekWords.textContent = 'Loading words...'; // Reset placeholder
}

export function setupSeerModalListeners() {
    if (DOM.seerAcceptBtn) DOM.seerAcceptBtn.addEventListener('click', handleSeerAccept);
    else console.warn("Listener not added: Seer Accept Btn not found");

    if (DOM.seerRejectBtn) DOM.seerRejectBtn.addEventListener('click', handleSeerReject);
     else console.warn("Listener not added: Seer Reject Btn not found");

    // Prevent clicks inside the modal content from closing it (optional, depends on desired behavior)
    if (DOM.seerPeekModal) {
        // Note: We typically DON'T want background clicks closing this specific modal,
        // as the user MUST accept or reject.
        if(DOM.seerPeekModalContent) DOM.seerPeekModalContent.addEventListener('click', (e) => e.stopPropagation());
    } else console.warn("Listeners not added: Seer Peek Modal not found");
}