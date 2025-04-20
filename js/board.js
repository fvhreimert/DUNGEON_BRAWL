// js/board.js
import * as DOM from './domElements.js';
import * as state from './state.js';
import * as config from './config.js';
import { showQuestion } from './modals/questionModal.js';
import { showSeerPeekModalContent } from './modals/seerModal.js';
import { showInfoModal } from './modals/infoModal.js';
import { removeFrogChestVisuals } from './features/frog.js'; // Import frog visual reset
// Import the state function needed to clear the restriction
import { clearPlayerForcedCategory } from './state.js'; // Adjust path if necessary

// --- Helper Function to Check if a Category is Empty ---
function isCategoryEmpty(categoryIndex) {
    // <<< Use state.selectedQuizData >>>
    if (!state.selectedQuizData || !state.selectedQuizData.categories || categoryIndex < 0 || categoryIndex >= state.selectedQuizData.categories.length) {
         console.warn(`[isCategoryEmpty] Invalid selected quiz data or category index ${categoryIndex}`);
         return true;
    }
    if (!DOM.questionsGrid) return true;

    const columns = DOM.questionsGrid.querySelectorAll('.category-column');
    if (!columns || columns.length <= categoryIndex || !columns[categoryIndex]) {
        console.warn(`[isCategoryEmpty] Could not find category column element for index ${categoryIndex}.`);
        return true;
    }
    // ... rest of the check remains the same ...
    const columnElement = columns[categoryIndex];
    const unopenedChestsInColumn = columnElement.querySelectorAll('.chest:not(.opened)');
    return unopenedChestsInColumn.length === 0;
}


// --- End Helper Function ---


export function createBoard() {
    if (!DOM.questionsGrid || !DOM.categoriesContainer) { /* ... error handling ... */ return; }
    if (!state.selectedQuizData || !Array.isArray(state.selectedQuizData.categories)) { // <<< NEW Check
        console.error("Cannot create board: No quiz data selected or categories are missing.");
        DOM.categoriesContainer.innerHTML = '<p class="error-message">Error: No Quiz Selected!</p>';
        DOM.questionsGrid.innerHTML = '';
        return;
    }

    DOM.questionsGrid.innerHTML = '';
    DOM.categoriesContainer.innerHTML = '';

    // <<< Use state.selectedQuizData >>>
    const currentCategories = state.selectedQuizData.categories;
    const numCategories = currentCategories.length;
    // --- Safety Check for Layout ---
    if (numCategories !== 6) {
        console.warn(`Selected quiz has ${numCategories} categories, but layout might expect 6. Adjusting grid.`);
        // You might want to handle layouts for different numbers of categories more robustly
    }
    // --- End Safety Check ---
    DOM.questionsGrid.style.gridTemplateColumns = `repeat(${numCategories}, 1fr)`;
    DOM.categoriesContainer.style.gridTemplateColumns = `repeat(${numCategories}, 1fr)`;

    currentCategories.forEach((category, categoryIndex) => { // Loop through selected categories
        const categoryHeader = document.createElement('div');
        categoryHeader.classList.add('category-header');
        categoryHeader.textContent = category.name; // Use name from selected data
        DOM.categoriesContainer.appendChild(categoryHeader);

        const column = document.createElement('div');
        column.classList.add('category-column');

        const baseValue = config.baseScoreIncrement;

        // Check if questions array exists
        if (!Array.isArray(category.questions)) {
            console.warn(`Category "${category.name}" has no questions array.`);
            // Optionally add a placeholder to the column
            column.innerHTML = '<p style="font-size: 0.7em; color: orange;">No Questions</p>';
        } else {
            category.questions.forEach((questionData, questionIndex) => {
                const chestWrapper = document.createElement('div');
                chestWrapper.classList.add('chest');
                chestWrapper.dataset.categoryIndex = categoryIndex;
                chestWrapper.dataset.questionIndex = questionIndex;
                const points = (questionIndex + 1) * baseValue;
                chestWrapper.dataset.points = points;

                const chestImg = document.createElement('img');
                chestImg.src = 'images/treasure_chest.png';
                chestImg.alt = `Chest ${categoryIndex}-${questionIndex} (${points} points)`;
                chestWrapper.appendChild(chestImg);

                const pointsSpan = document.createElement('span');
                pointsSpan.classList.add('chest-points');
                pointsSpan.textContent = points;
                chestWrapper.appendChild(pointsSpan);

                chestWrapper.addEventListener('click', handleChestClick);
                column.appendChild(chestWrapper);
            });
        }
        DOM.questionsGrid.appendChild(column);
    });
}



export function handleChestClick(event) {
    console.log("--- Chest Click Detected ---"); // <<< STEP 1: Log start

    const chest = event.currentTarget;
    if (!chest) {
        console.error("Chest Click Error: event.currentTarget is invalid.");
        return;
    }
    console.log("Chest Element:", chest); // Log the element itself
    console.log("Chest Classes:", chest.className); // Log classes
    console.log("Chest Dataset:", JSON.stringify(chest.dataset)); // Log all data attributes

    // <<< STEP 2: Check Game State Flags >>>
    if (state.isFrogChoosing) {
        console.log("Click blocked: Frog is choosing.");
        return;
    }
    if (state.isSeerPeeking) {
        // Handle Seer Peek logic (should be okay from previous code)
        console.log("Processing click for Seer Peek...");
        if (!chest.classList.contains('opened') && chest.classList.contains('seer-peek-available')) {
            state.setSeerPeekTargetChest(chest);
            const catIndexPeek = parseInt(chest.dataset.categoryIndex);
            const qIndexPeek = parseInt(chest.dataset.questionIndex);
            if (!state.selectedQuizData || !state.selectedQuizData.categories) { // Check quiz data
                 console.error("Seer Peek Error: No quiz data loaded.");
                 showInfoModal("Game Error", "Cannot peek, quiz data missing.");
                 cancelSeerPeekMode(); // Cancel seer mode if data is bad
                 return;
            }
            const questionText = state.selectedQuizData.categories[catIndexPeek]?.questions[qIndexPeek]?.q;
            if (questionText) {
                showSeerPeekModalContent(questionText);
            } else {
                console.error("Seer Peek Error: Could not find question data for chest:", chest.dataset);
                showInfoModal("Seer Error", "The Seer gets confused trying to peek...");
                cancelSeerPeekMode(); // Cancel on error
            }
        } else {
             console.log("Seer Peek: Clicked invalid chest (opened or not available).");
        }
        return; // Always return after handling or ignoring Seer click
    }
    console.log("State check passed: Not Frog choosing, Not Seer peeking.");

    // <<< STEP 3: Check if Chest is Opened >>>
    if (chest.classList.contains('opened')) {
        console.log("Click blocked: Chest already opened.");
        return;
    }
    console.log("Chest is not opened.");

    // <<< STEP 4: Check for Quiz Data (Essential before proceeding) >>>
    if (!state.selectedQuizData || !Array.isArray(state.selectedQuizData.categories)) {
        console.error("Chest Click Error: No quiz data loaded in state.");
        showInfoModal("Game Error", "Cannot load question, quiz data is missing.");
        return; // Stop if no data
    }
    console.log("Quiz data is loaded.");

    // <<< STEP 5: Puppet Master Check >>>
    const currentPlayerIndex = state.currentPlayerIndex;
    const currentPlayer = state.players[currentPlayerIndex];
    let proceedClick = true; // Assume click should proceed unless blocked

    if (currentPlayer && currentPlayer.forcedCategoryIndex !== null) {
        console.log(`Puppet Master Active: Player ${currentPlayerIndex} forced to category ${currentPlayer.forcedCategoryIndex}`);
        const forcedCategoryIndex = currentPlayer.forcedCategoryIndex;
        const clickedCategoryIndex = parseInt(chest.dataset.categoryIndex);
        const currentCategories = state.selectedQuizData.categories; // Use loaded categories

        // Validate indices before using them
        if (isNaN(clickedCategoryIndex)) {
             console.error("Puppet Check Error: clickedCategoryIndex is NaN", chest.dataset.categoryIndex);
             proceedClick = false; // Block if index is invalid
        } else if (forcedCategoryIndex < 0 || forcedCategoryIndex >= currentCategories.length) {
             console.error("Puppet Check Error: forcedCategoryIndex is out of bounds", forcedCategoryIndex);
             // This is bad state, maybe clear the restriction?
             clearPlayerForcedCategory(currentPlayerIndex);
             clearCategoryHighlights();
             // Allow click to proceed in this error case? Or block? Let's proceed for now.
        } else {
            // Indices are valid, perform checks
            const forcedCategoryName = currentCategories[forcedCategoryIndex]?.name || `Category #${forcedCategoryIndex + 1}`;
            console.log(`Clicked Category Index: ${clickedCategoryIndex}`);

            if (isCategoryEmpty(forcedCategoryIndex)) {
                console.log(`Puppet Check: Forced category ${forcedCategoryIndex} ('${forcedCategoryName}') is empty. Lifting restriction.`);
                showInfoModal("Puppet's Grip Weakens!", `The "${forcedCategoryName}" category is empty! You are free to choose any question this turn.`);
                clearPlayerForcedCategory(currentPlayerIndex);
                clearCategoryHighlights();
                // proceedClick remains true
            } else if (clickedCategoryIndex !== forcedCategoryIndex) {
                console.log(`Puppet Check Blocked: Clicked ${clickedCategoryIndex}, required ${forcedCategoryIndex}.`);
                showInfoModal("Puppet's Choice!", `You are compelled to choose a question from the "${forcedCategoryName}" category this turn!`);
                proceedClick = false; // Block the click
            } else {
                console.log(`Puppet Check OK: Clicked correct forced category ${forcedCategoryIndex}. Clearing restriction.`);
                clearPlayerForcedCategory(currentPlayerIndex);
                clearCategoryHighlights();
                // proceedClick remains true
            }
        }
    } else {
         console.log("No Puppet Master restriction active.");
         // proceedClick remains true
    }
    // <<< End Puppet Master Check >>>


    // <<< STEP 6: Proceed only if not blocked >>>
    if (!proceedClick) {
        console.log("Click processing stopped by checks.");
        return; // Stop if any check set proceedClick to false
    }

    // --- If we reach here, the click is valid ---
    console.log("Click is valid, proceeding to open chest...");

    // --- Resume Normal Chest Opening Logic ---
    chest.classList.add('opened');
    const chestImg = chest.querySelector('img');
    if (chestImg) chestImg.src = 'images/treasure_chest_open.png';
    chest.classList.remove('seer-peek-available'); // Ensure this is removed

    const basePoints = parseInt(chest.dataset.points) || config.baseScoreIncrement; // Use config for default
    const multiplier = state.getChestMultiplier(chest);
    state.setCurrentQuestionParams(basePoints, multiplier); // Store points for scoring later

    if (multiplier > 1) {
        console.log(`Opening chest with Frog multiplier: ${multiplier}x`);
        state.deleteChestMultiplier(chest); // Consume multiplier from state
        removeFrogChestVisuals(chest); // Remove visuals
    } else {
        console.log("Opening standard chest.");
    }

    const catIndex = parseInt(chest.dataset.categoryIndex);
    const qIndex = parseInt(chest.dataset.questionIndex);

    // Validate indices again before accessing data
     if (isNaN(catIndex) || isNaN(qIndex) || catIndex < 0 || qIndex < 0 ||
         !state.selectedQuizData.categories[catIndex] ||
         !state.selectedQuizData.categories[catIndex].questions ||
         !state.selectedQuizData.categories[catIndex].questions[qIndex]) {

         console.error("Error finding question data: Invalid indices or data structure.", { catIndex, qIndex });
         showInfoModal("Game Error", "Could not load question data for this chest (invalid index). Oops!");
         // Revert visual changes if data is bad
         chest.classList.remove('opened');
         if (chestImg) chestImg.src = 'images/treasure_chest.png';
         state.resetCurrentQuestionParams(); // Reset points state
         return;
     }

    const questionData = state.selectedQuizData.categories[catIndex].questions[qIndex];
    const totalPoints = basePoints * multiplier;
    console.log(`Showing question: Cat=${catIndex}, Q=${qIndex}, Points=${totalPoints}`);
    showQuestion(questionData.q, questionData.a, totalPoints); // Show the actual question modal
}

export function clearCategoryHighlights() {
    if (!DOM.questionsGrid || !DOM.body) return;
    DOM.questionsGrid.querySelectorAll('.category-column.forced-category').forEach(col => {
        col.classList.remove('forced-category');
    });
    DOM.body.classList.remove('forced-active'); // Also remove body class
    console.log("[Board] Cleared all forced category highlights.");
}