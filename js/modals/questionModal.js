// js/modals/questionModal.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import { nextTurn } from '../player.js'; // Import turn logic
import { cancelSeerPeekMode } from '../features/seer.js'; // Import Seer logic if needed

let wasAnswerRevealed = false;

export function showQuestion(questionText, answerText, totalPoints) {
    if (!DOM.questionModal || !DOM.modalQuestion || !DOM.modalAnswer || !DOM.modalPointsDisplay || !DOM.revealBtn || !DOM.nextTurnBtn) {
        console.error("Cannot show question: Essential modal elements missing.");
        return;
    }

    wasAnswerRevealed = false; // Reset reveal status

    // --- SAFE Update Displays ---
    DOM.modalPointsDisplay.textContent = `${totalPoints} POINTS`;
    DOM.modalQuestion.textContent = questionText;
    DOM.modalAnswer.textContent = answerText; // Set answer text but hide it
    DOM.modalAnswer.style.display = 'none'; // Ensure answer is hidden initially
    state.setCurrentAnswer(answerText); // Store answer in state

    // --- SAFE Button/Modal Updates ---
    DOM.revealBtn.style.display = 'inline-block'; // Show reveal button
    DOM.nextTurnBtn.style.display = 'none'; // Hide next turn button
    DOM.questionModal.style.display = 'flex'; // Show the modal
}

export function revealAnswer() {
    console.log("revealAnswer triggered");
    if (!DOM.modalAnswer || !DOM.revealBtn || !DOM.nextTurnBtn) {
        console.error("Cannot reveal answer: One or more required modal elements missing.");
        return;
    }
    DOM.modalAnswer.style.display = 'block'; // Show the answer
    DOM.revealBtn.style.display = 'none'; // Hide reveal button
    DOM.nextTurnBtn.style.display = 'inline-block'; // Show next turn button
    wasAnswerRevealed = true; // Mark as revealed
}

export function closeModalAndMaybePassTurn() {
    console.log("closeModalAndMaybePassTurn triggered");
    if (!DOM.questionModal || !DOM.modalQuestion || !DOM.modalAnswer || !DOM.modalPointsDisplay || !DOM.revealBtn || !DOM.nextTurnBtn) {
        console.error("Cannot close modal properly: One or more required modal elements not found.");
        if (DOM.questionModal) DOM.questionModal.style.display = 'none'; // Attempt to hide as fallback
        state.resetCurrentQuestionParams(); // Reset state anyway
        return; // Stop execution
    }

    DOM.questionModal.style.display = 'none'; // Hide modal

    // Clear content
    DOM.modalQuestion.textContent = '';
    DOM.modalAnswer.textContent = '';
    DOM.modalAnswer.style.display = 'none';
    DOM.modalPointsDisplay.textContent = '';

    // Reset buttons
    DOM.revealBtn.style.display = 'inline-block';
    DOM.nextTurnBtn.style.display = 'none';
    state.setCurrentAnswer(''); // Clear answer state

    // Reset question-specific state
    console.log("Closing question modal, resetting question points/multiplier.");
    state.resetCurrentQuestionParams();

    // Handle game state
    if (state.isSeerPeeking) { // Check state flag
        cancelSeerPeekMode();
    }

    if (wasAnswerRevealed) {
        nextTurn(); // Pass the turn only if the answer was shown
    } else {
        console.log("Question modal closed before answer revealed. Turn not passed.");
    }
    wasAnswerRevealed = false; // Reset for next time
}

export function setupQuestionModalListeners() {
    if (DOM.revealBtn) {
        DOM.revealBtn.addEventListener('click', revealAnswer);
    } else {
        console.error("FATAL: Reveal Answer button not found, cannot attach listener.");
    }

    if (DOM.closeBtn) {
        DOM.closeBtn.addEventListener('click', closeModalAndMaybePassTurn);
    } else {
        console.error("FATAL: Question Modal Close button not found, cannot attach listener.");
    }

    if (DOM.nextTurnBtn) {
        DOM.nextTurnBtn.addEventListener('click', closeModalAndMaybePassTurn);
    } else {
        console.error("FATAL: Next Turn button not found, cannot attach listener.");
    }

    if (DOM.questionModal) {
        DOM.questionModal.addEventListener('click', (event) => {
            if (event.target === DOM.questionModal) closeModalAndMaybePassTurn();
        });
         if(DOM.questionModalContent) DOM.questionModalContent.addEventListener('click', (event) => { event.stopPropagation(); });
         else console.warn("Could not attach stopPropagation to question modal content.");
    } else {
         console.error("FATAL: Question Modal not found, cannot attach background click listener.");
    }
}