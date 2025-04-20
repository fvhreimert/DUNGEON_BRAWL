// js/modals/categorySelectModal.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
// import * as config from '../config.js'; // To get category names
import { showError } from '../utils.js';

// --- Module-level variables ---
let onCategorySelectedCallback = null;
let currentVictimIndex = -1;
let currentActivatingIndex = -1; // Store who is using the card

// --- Get Modal Elements (Add these to domElements.js first!) ---
let categorySelectModal = null;
let categorySelectTitle = null;
let categorySelectText = null;
let categorySelectList = null;
let categorySelectCloseBtn = null;
let categorySelectError = null;
let categorySelectModalContent = null;

// Function to initialize elements (call once after DOM is loaded)
function initializeCategorySelectDOMElements() {
    categorySelectModal = DOM.getElement('#category-select-modal', false);
    categorySelectTitle = DOM.getElement('#category-select-title', false);
    categorySelectText = DOM.getElement('#category-select-text', false);
    categorySelectList = DOM.getElement('#category-select-list', false);
    categorySelectCloseBtn = categorySelectModal ? DOM.getElement('.category-select-close', false) : null;
    categorySelectError = DOM.getElement('#category-select-error', false);
    categorySelectModalContent = categorySelectModal ? DOM.getElement('.category-select-content', false) : null;
}

// --- Function to show the modal ---
export function showCategorySelectModal(activatingPlayerIndex, victimPlayerIndex, callback) {
    if (!categorySelectModal || !categorySelectList /*...etc...*/) { /* ... error handling ... */ return; }
    if (typeof callback !== 'function') { /* ... error handling ... */ return; }
    if (victimPlayerIndex < 0 || victimPlayerIndex >= state.players.length) { /* ... error handling ... */ return; }

    // <<< Check if quiz data is loaded >>>
    if (!state.selectedQuizData || !Array.isArray(state.selectedQuizData.categories)) {
        console.error("Cannot show category select modal: No quiz data loaded in state.");
        showInfoModal("Error", "Cannot select category, quiz data missing."); // Show generic info modal
        return;
    }

    console.log(`[CategorySelect] Showing modal. Activating: ${activatingPlayerIndex}, Victim: ${victimPlayerIndex}`);

    onCategorySelectedCallback = callback;
    currentVictimIndex = victimPlayerIndex;
    currentActivatingIndex = activatingPlayerIndex;

    // Populate category buttons
    categorySelectList.innerHTML = '';
    categorySelectError.style.display = 'none';

    const victimName = state.players[currentVictimIndex]?.name || 'the victim';
    categorySelectTitle.textContent = `Choose ${victimName}'s Fate!`;
    categorySelectText.textContent = `Select the category ${victimName} will be forced into:`;

    // <<< Use state.selectedQuizData >>>
    state.selectedQuizData.categories.forEach((category, index) => {
        const categoryButton = document.createElement('button');
        categoryButton.textContent = category.name; // Use name from selected data
        categoryButton.dataset.categoryIndex = index;
        categorySelectList.appendChild(categoryButton);
    });

    categorySelectModal.style.display = 'flex';
}

// --- Handler for clicking a category button ---
function handleCategorySelect(event) {
    if (event.target.tagName !== 'BUTTON' || !event.target.closest('#category-select-list')) { return; }

    // <<< Check quiz data again before processing >>>
    if (!state.selectedQuizData || !Array.isArray(state.selectedQuizData.categories)) {
         console.error("Category Select Error: Quiz data missing when button clicked.");
         closeCategorySelectModal();
         return;
    }

    const selectedCategoryIndex = parseInt(event.target.dataset.categoryIndex);

    // <<< Use selected quiz data length for validation >>>
    if (isNaN(selectedCategoryIndex) || selectedCategoryIndex < 0 || selectedCategoryIndex >= state.selectedQuizData.categories.length) {
        console.error("Invalid category index selected:", event.target.dataset.categoryIndex);
        showError("Invalid category selected.", categorySelectError);
        return;
    }

    // <<< Use selected quiz data for logging name >>>
    console.log(`[CategorySelect] Category selected: Index ${selectedCategoryIndex} ('${state.selectedQuizData.categories[selectedCategoryIndex].name}') for Victim ${currentVictimIndex}`);

    if (typeof onCategorySelectedCallback === 'function') {
        try {
            onCategorySelectedCallback(currentActivatingIndex, currentVictimIndex, selectedCategoryIndex);
        } catch (error) { /* ... error handling ... */ }
    } else { /* ... warning ... */ }

    closeCategorySelectModal();
}

// --- Function to close the modal ---
export function closeCategorySelectModal() {
    if (categorySelectModal) categorySelectModal.style.display = 'none';
    if (categorySelectList) categorySelectList.innerHTML = ''; // Clear buttons
    if (categorySelectError) categorySelectError.style.display = 'none';

    // Clear stored data
    onCategorySelectedCallback = null;
    currentVictimIndex = -1;
    currentActivatingIndex = -1;
}

// --- Setup Listeners (call once from main.js) ---
export function setupCategorySelectModalListeners() {
    // Call initializer here or ensure it's called reliably elsewhere
    initializeCategorySelectDOMElements();

    if (!categorySelectModal) {
        console.warn("Category Select Modal element not found, cannot set up listeners.");
        return;
    }

    if (categorySelectCloseBtn) {
        categorySelectCloseBtn.addEventListener('click', closeCategorySelectModal);
    } else console.warn("Listener not added: Category Select Close Btn missing.");

    if (categorySelectList) {
        // Use event delegation on the list container
        categorySelectList.addEventListener('click', handleCategorySelect);
    } else console.warn("Listener not added: Category Select List missing.");

    // Background click
    categorySelectModal.addEventListener('click', (event) => {
        if (event.target === categorySelectModal) closeCategorySelectModal();
    });
    // Prevent content click from closing
    if (categorySelectModalContent) {
        categorySelectModalContent.addEventListener('click', (e) => e.stopPropagation());
    }
}