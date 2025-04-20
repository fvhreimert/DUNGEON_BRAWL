// js/setup.js
import * as DOM from './domElements.js';
import * as state from './state.js';
import { showError } from './utils.js';
import * as config from './config.js'; // Import config to get quiz list
import { STARTING_SCORE } from './config.js';

// Callback to signal setup completion to main.js
let onSetupCompleteCallback = null;

export function startSetup(onComplete) {
    onSetupCompleteCallback = onComplete; // Store the callback
    showSetupStep('count'); // Show the first step
    if (DOM.playerCountInput) DOM.playerCountInput.focus();

    // Setup listeners specific to the setup phase
    setupSetupListeners();
    showQuizSelectionStep();
}

// --- NEW: Show Quiz Selection ---
function showQuizSelectionStep() {
    if (!DOM.quizSelectionStep || !DOM.quizListContainer || !DOM.quizSelectError || !DOM.playerCountStep || !DOM.playerNamesStep ) {
        console.error("Cannot show quiz selection: Required elements missing.");
        // Optionally show a generic error in the modal
        if (DOM.setupError) showError("Setup Error: UI elements missing.", DOM.setupError);
        return;
    }

    // Hide other steps
    DOM.playerCountStep.style.display = 'none';
    DOM.playerNamesStep.style.display = 'none';
    if (DOM.setupError) DOM.setupError.style.display = 'none'; // Hide player name error too
    DOM.quizSelectError.textContent = '';
    DOM.quizSelectError.style.display = 'none';


    // Populate Quiz List
    DOM.quizListContainer.innerHTML = ''; // Clear previous
    const quizKeys = Object.keys(config.allQuizzes);

    if (quizKeys.length === 0) {
        DOM.quizListContainer.innerHTML = '<p>No quiz packs found in configuration!</p>';
        showError("No quizzes configured!", DOM.quizSelectError);
        return;
    }

    quizKeys.forEach(key => {
        const quizInfo = config.allQuizzes[key];
        const button = document.createElement('button');
        button.textContent = quizInfo.displayName;
        button.dataset.quizKey = key; // Store the key to identify selection
        button.addEventListener('click', handleQuizSelect); // Add listener directly
        DOM.quizListContainer.appendChild(button);
    });

    // Show the quiz step
    DOM.quizSelectionStep.style.display = 'block';
}

// --- NEW: Handle Quiz Selection ---
function handleQuizSelect(event) {
    const selectedKey = event.target.dataset.quizKey;
    if (!selectedKey || !config.allQuizzes[selectedKey]) {
        console.error("Invalid quiz key selected:", selectedKey);
        showError("Invalid selection.", DOM.quizSelectError);
        return;
    }

    console.log("Quiz selected:", selectedKey);
    state.setSelectedQuizData(selectedKey); // Set the chosen quiz data in state

    // Hide quiz step and show player count step
    if(DOM.quizSelectionStep) DOM.quizSelectionStep.style.display = 'none';
    showSetupStep('count'); // Use existing function to show player count
    if(DOM.playerCountInput) DOM.playerCountInput.focus(); // Focus player count input
}

function showSetupStep(stepToShow) {
    // Ensure elements exist (including new quiz step)
    if (!DOM.playerCountStep || !DOM.playerNamesStep || !DOM.setupError || !DOM.quizSelectionStep) {
        console.error("Cannot show setup step: Required elements missing.");
        return;
    }
    // Hide all steps first
    DOM.quizSelectionStep.style.display = 'none'; // Hide quiz step too
    DOM.playerCountStep.style.display = 'none';
    DOM.playerNamesStep.style.display = 'none';
    // Clear and hide error messages
    DOM.setupError.textContent = '';
    DOM.setupError.style.display = 'none';
     if (DOM.quizSelectError) {
        DOM.quizSelectError.textContent = '';
        DOM.quizSelectError.style.display = 'none';
     }

    // Show the requested step
    if (stepToShow === 'count') {
        DOM.playerCountStep.style.display = 'block';
    } else if (stepToShow === 'names') {
        DOM.playerNamesStep.style.display = 'block';
    }
    // Note: Quiz selection is shown by showQuizSelectionStep() initially
}

function generateNameInputs(numPlayers) {
    if (!DOM.playerNameInputsContainer) {
        console.error("Cannot generate name inputs: Container not found.");
        return;
    }
    DOM.playerNameInputsContainer.innerHTML = ''; // Clear previous inputs
    for (let i = 0; i < numPlayers; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Player ${i + 1} Name`;
        input.id = `player-name-${i}`;
        input.required = true; // Basic HTML validation
        DOM.playerNameInputsContainer.appendChild(input);
    }
    showSetupStep('names'); // Show the name input step
    // Focus the first name input field
    const firstInput = DOM.playerNameInputsContainer.querySelector('input');
    if (firstInput) firstInput.focus();
}

function handlePlayerCountSubmit() {
    if (!DOM.playerCountInput) {
        console.error("Cannot submit count: Input missing.");
        return;
    }
    const count = parseInt(DOM.playerCountInput.value);
    if (isNaN(count) || count < 1 || count > 6) { // Add reasonable upper limit
        showError("Please enter a number between 1 and 6.", DOM.setupError);
        DOM.playerCountInput.focus();
        return;
    }
    generateNameInputs(count);
}

function handleStartGameAttempt() {
    if (!DOM.playerNameInputsContainer || !DOM.body) {
        console.error("Cannot start game: Core elements missing.");
        return;
    }
    const tempPlayers = [];
    const nameInputs = DOM.playerNameInputsContainer.querySelectorAll('input[type="text"]');
    let allNamesValid = true;

    nameInputs.forEach((input, index) => {
        const name = input.value.trim();
        if (name === "") {
            allNamesValid = false;
            input.style.borderColor = '#ff6b6b';
        } else {
            input.style.borderColor = '';
            tempPlayers.push({
                name: name,
                score: STARTING_SCORE, // <--- USE IMPORTED CONSTANT HERE
                id: `player-${index}`, // Simple ID (consider more robust ID later)
                // Other properties like inventory, curses, etc., will be added by setPlayers
            });
        }
    });

    if (!allNamesValid) {
        showError("Please enter a name for each player.", DOM.setupError);
        return;
    }

    if (tempPlayers.length > 0) {
        // Pass the array with the correct starting score to setPlayers
        state.setPlayers(tempPlayers);
        state.setCurrentPlayerIndex(0); // Start with the first player

        DOM.body.classList.remove('setup-active');
        DOM.body.classList.add('game-active');

        if (typeof onSetupCompleteCallback === 'function') {
            onSetupCompleteCallback(); // This will call initializeGame in main.js
        } else {
            console.error("Setup complete, but no callback provided to main.js!");
        }

    } else {
        showError("No players were created. Please go back.", DOM.setupError);
        showSetupStep('count');
    }
}

// Listeners specific to the setup process
function setupSetupListeners() {
    // console.log("Checking submitPlayerCountBtn element:", DOM.submitPlayerCountBtn); // Keep console logs for debugging if needed
    if (DOM.submitPlayerCountBtn) {
         DOM.submitPlayerCountBtn.addEventListener('click', () => { // Using arrow function
             // console.log("Submit Player Count Button Clicked!");
             handlePlayerCountSubmit();
         });
    } else console.warn("Listener not added: Submit Player Count Btn missing.");
    if (DOM.startGameBtn) {
         DOM.startGameBtn.addEventListener('click', handleStartGameAttempt);
    } else console.warn("Listener not added: Start Game Btn missing.");

    // Allow Enter key press in count input
    if (DOM.playerCountInput) {
        DOM.playerCountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission if inside a form
                handlePlayerCountSubmit();
            }
        });
    } else console.warn("Listener not added: Player Count Input missing.");

    // Allow Enter key press in name inputs to move to next or start game
    if (DOM.playerNameInputsContainer) {
        DOM.playerNameInputsContainer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                const inputs = Array.from(DOM.playerNameInputsContainer.querySelectorAll('input'));
                const currentIndex = inputs.indexOf(e.target);

                if (currentIndex === inputs.length - 1) {
                    // If Enter pressed on the last input, attempt to start game
                    handleStartGameAttempt();
                } else if (currentIndex !== -1 && currentIndex + 1 < inputs.length) {
                    // Move focus to the next input field
                    inputs[currentIndex + 1].focus();
                }
            }
        });
    } else console.warn("Listener not added: Player Name Inputs Container missing.");
}