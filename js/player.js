// js/player.js
import * as DOM from './domElements.js';
import * as state from './state.js';
import * as config from './config.js';
import { cancelSeerPeekMode } from './features/seer.js';
import { showInventoryModal } from './modals/inventoryModal.js';
import { clearCategoryHighlights } from './board.js';
// Note: No longer importing showInfoModal or buildCardElement here

// --- Constants for Font Resizing ---
const MAX_PLAYER_NAME_FONT_SIZE_EM = 0.9; // Match your default CSS em size
const MIN_PLAYER_NAME_FONT_SIZE_PX = 8; // Minimum pixel size (adjust as needed)
const FONT_RESIZE_STEP_PX = 0.5; // How much to shrink each iteration

// Prevents the resize function from firing too rapidly
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Function to Update All Player Name Fonts ---
function updateAllPlayerNameFonts() {
    const nameElements = document.querySelectorAll('.player-card .player-name');
    // console.log(`Adjusting font size for ${nameElements.length} player names.`);
    nameElements.forEach(adjustPlayerNameFontSize);
}

// --- Debounced Resize Handler ---
const debouncedResizeHandler = debounce(updateAllPlayerNameFonts, 150); // Adjust delay (ms) as needed


// --- adjustPlayerNameFontSize function (Minor Refinement) ---
function adjustPlayerNameFontSize(nameElement) {
    if (!nameElement || !nameElement.parentElement || !document.body.contains(nameElement)) {
         // console.warn("adjustPlayerNameFontSize skipped: Element not valid or not in DOM.");
         return; // Don't process if element isn't ready/visible
    }

    // Calculate max size in pixels based on parent's font size
    // Use parentElement for calculation context if needed, or rely on element's own context
    const parentFontSize = parseFloat(window.getComputedStyle(nameElement.parentElement).fontSize);
    const maxPx = MAX_PLAYER_NAME_FONT_SIZE_EM * parentFontSize;

    // Reset to max size first to handle cases where container grew
    // IMPORTANT: Ensure unit consistency! Use pixels.
    nameElement.style.fontSize = `${maxPx}px`;

    // Force a reflow to ensure dimensions are calculated based on the new max size
    // void nameElement.offsetWidth; // This can sometimes help, uncomment if needed

    let currentSizePx = maxPx;
    const containerWidth = nameElement.clientWidth; // The available width of the .player-name element itself

    // Check scrollWidth vs containerWidth
    // scrollWidth measures the actual width of the content (the text)
    if (nameElement.scrollWidth <= containerWidth) {
         // console.log(`Name "${nameElement.textContent}" fits at max size (${maxPx}px). No adjustment needed.`);
        // If it already fits, we might not need the loop. But resetting ensures it can grow back up.
        // We could potentially return early here if performance is critical.
    }

    let iterations = 0;
    const maxIterations = 50;

    // Shrink font size incrementally
    while (nameElement.scrollWidth > containerWidth && currentSizePx > MIN_PLAYER_NAME_FONT_SIZE_PX && iterations < maxIterations) {
        currentSizePx -= FONT_RESIZE_STEP_PX;
        nameElement.style.fontSize = `${currentSizePx}px`;
        iterations++;
    }

     // Add a small log after adjustment
     // console.log(`Adjusted "${nameElement.textContent}" to ${currentSizePx}px after ${iterations} iterations.`);
}


// --- Player Display and Score ---

export function createPlayerDisplays() {
    if (!DOM.playerCardsContainer) {
        console.error("Cannot create player displays: Container missing.");
        return;
    }
    DOM.playerCardsContainer.innerHTML = ''; // Clear existing cards

    state.players.forEach((player, index) => {
        const card = document.createElement('div');
        card.classList.add('player-card');
        card.id = `player-card-${index}`;
        card.dataset.playerIndex = index;

        // --- Player Info Top Section (Name + Inventory Icon) ---
        const playerInfoTop = document.createElement('div');
        playerInfoTop.classList.add('player-info-top');
        const nameEl = document.createElement('div');
        nameEl.classList.add('player-name');
        nameEl.textContent = player.name;
        nameEl.style.fontSize = `${MAX_PLAYER_NAME_FONT_SIZE_EM}em`; // Set initial max size
        const inventoryIcon = document.createElement('img');
        inventoryIcon.src = 'images/inventory.png';
        inventoryIcon.alt = 'Inventory';
        inventoryIcon.title = `${player.name}'s Inventory`;
        inventoryIcon.classList.add('inventory-button-icon');
        inventoryIcon.dataset.playerIndex = index;
        inventoryIcon.addEventListener('click', handleInventoryIconClick);
        playerInfoTop.appendChild(nameEl);
        playerInfoTop.appendChild(inventoryIcon);

        // --- Score Display ---
        const scoreEl = document.createElement('div');
        scoreEl.classList.add('player-score');
        scoreEl.id = `player-score-${index}`;

        // --- Manual Score Buttons ---
        const buttonsEl = document.createElement('div');
        buttonsEl.classList.add('score-buttons');

        // <<< START: PUT BUTTON CREATION BACK INSIDE THE LOOP >>>
        // --- Button Values ---
        const smallIncrement = 10;
        const largeIncrement = config.baseScoreIncrement; // Use config value

        // --- Create Buttons (Order: +10, +200, -200, -10) ---
        // +10 Button
        const addSmallBtn = document.createElement('button');
        addSmallBtn.textContent = `+${smallIncrement}`;
        addSmallBtn.title = `Add ${smallIncrement} points for ${player.name}`;
        addSmallBtn.dataset.action = 'add_small';
        addSmallBtn.addEventListener('click', (e) => handleManualScoreUpdate(e, index, smallIncrement)); // Pass direct value

        // +200 Button
        const addLargeBtn = document.createElement('button');
        addLargeBtn.textContent = `+${largeIncrement}`;
        addLargeBtn.title = `Add ${largeIncrement} points for ${player.name}`;
        addLargeBtn.dataset.action = 'add_large';
        addLargeBtn.addEventListener('click', (e) => handleManualScoreUpdate(e, index, largeIncrement)); // Pass direct value

        // -200 Button
        const subtractLargeBtn = document.createElement('button');
        subtractLargeBtn.classList.add('subtract-score'); // Keep class for styling
        subtractLargeBtn.textContent = `-${largeIncrement}`;
        subtractLargeBtn.title = `Subtract ${largeIncrement} points for ${player.name}`;
        subtractLargeBtn.dataset.action = 'subtract_large';
        subtractLargeBtn.addEventListener('click', (e) => handleManualScoreUpdate(e, index, -largeIncrement)); // Pass direct negative value

        // -10 Button
        const subtractSmallBtn = document.createElement('button');
        subtractSmallBtn.classList.add('subtract-score'); // Keep class for styling
        subtractSmallBtn.textContent = `-${smallIncrement}`;
        subtractSmallBtn.title = `Subtract ${smallIncrement} points for ${player.name}`;
        subtractSmallBtn.dataset.action = 'subtract_small';
        subtractSmallBtn.addEventListener('click', (e) => handleManualScoreUpdate(e, index, -smallIncrement)); // Pass direct negative value
        // <<< END: BUTTON CREATION LOGIC >>>

        // Append Buttons in desired order
        buttonsEl.appendChild(addSmallBtn);      // Now defined
        buttonsEl.appendChild(addLargeBtn);      // Now defined
        buttonsEl.appendChild(subtractLargeBtn); // Now defined
        buttonsEl.appendChild(subtractSmallBtn); // Now defined
        // --- End Button Append ---

        // --- Inventory Icons Display Area (Hidden by CSS) ---
        const inventoryEl = document.createElement('div');
        inventoryEl.classList.add('player-inventory');
        inventoryEl.id = `player-inventory-${index}`;

        // --- Assemble Card ---
        card.appendChild(playerInfoTop);
        card.appendChild(scoreEl);
        card.appendChild(buttonsEl);
        card.appendChild(inventoryEl);

        // <<< ADD EVENT LISTENER HERE >>>
        card.addEventListener('click', handlePlayerCardClick);

        // <<< ADD card TO DOM >>>
        DOM.playerCardsContainer.appendChild(card);

        // --- Initial Updates (Score/Inventory) ---
        updateScoreDisplay(index, player.score);
        updatePlayerInventoryDisplay(index);

        // <<< ADJUST FONT SIZE *AFTER* card is in the DOM >>>
        const nameElementInDOM = document.getElementById(`player-card-${index}`).querySelector('.player-name');
        if (nameElementInDOM) {
            adjustPlayerNameFontSize(nameElementInDOM);
        } else {
            console.error(`CRITICAL ERROR: Could not find player name element (player ${index}) even after adding card to DOM.`);
        }

    }); // <<< End of forEach loop >>>

    updateTurnIndicator(); // Highlight first player

    // --- Setup Resize Listener (Outside Loop, as before) ---
    window.removeEventListener('resize', debouncedResizeHandler);
    window.addEventListener('resize', debouncedResizeHandler);
}



// Handles clicks on the inventory icon on a player card
function handleInventoryIconClick(event) {
    event.stopPropagation(); // Prevent turn change click
    const playerIndex = parseInt(event.currentTarget.dataset.playerIndex);
    if (!isNaN(playerIndex)) {
        console.log(`Inventory icon clicked for player ${playerIndex}`);
        showInventoryModal(playerIndex); // Open the detailed inventory modal
    } else {
        console.error("Could not get player index from inventory icon.");
    }
}

// Updates the small (hidden by default) inventory icons on the player card
export function updatePlayerInventoryDisplay(playerIndex) {
    const inventoryContainer = document.getElementById(`player-inventory-${playerIndex}`);
    const player = state.players[playerIndex];

    if (!inventoryContainer) {
        return; // Element not found
    }
    if (!player || !Array.isArray(player.inventory)) {
        console.warn(`Player data or inventory array invalid for player ${playerIndex}. Clearing display.`);
        inventoryContainer.innerHTML = ''; // Clear if state is bad
        return;
    }

    inventoryContainer.innerHTML = ''; // Clear previous icons

    // Rebuild icons from current inventory state
    player.inventory.forEach(cardObj => {
        const filename = cardObj.filename;
        if (!filename) return; // Skip if filename is missing

        const img = document.createElement('img');
        try {
            img.src = config.cardsFolderPath + filename; // Use the card object's filename
            const cardName = filename.replace('.png', '').replace(/_/g, ' ');
            img.alt = cardName;
            img.title = cardName; // Consider adding (Shiny) if cardObj.isShiny later
            img.classList.add('inventory-card-icon');
            inventoryContainer.appendChild(img);
        } catch (error) {
            console.error(`Error creating inventory icon for ${filename}:`, error);
        }
    });
}

// Updates the score text content and applies visual styles/animations
export function updateScoreDisplay(playerIndex, newScore) {
    const scoreElement = document.getElementById(`player-score-${playerIndex}`);
    if (scoreElement) {
        // Update text
        scoreElement.textContent = newScore;

        // Manage classes for styling and animation
        scoreElement.classList.remove('score-positive', 'score-negative', 'score-change');
        scoreElement.classList.add(newScore >= 0 ? 'score-positive' : 'score-negative');

        // Trigger animation if element is visible
        if (scoreElement.offsetParent !== null) {
            void scoreElement.offsetWidth; // Force reflow
            scoreElement.classList.add('score-change');
            // Remove animation class after duration
            setTimeout(() => {
                const currentElement = document.getElementById(`player-score-${playerIndex}`);
                if (currentElement) currentElement.classList.remove('score-change');
            }, 500); // Duration should match CSS animation
        }
    }
}

// Central function to modify player score in state and update display
export function modifyPlayerScore(playerIndex, amount) {
    // Validate inputs
    if (isNaN(amount)) {
        console.error(`Invalid amount for score modification: ${amount} (Player Index: ${playerIndex})`);
        return;
    }
    if (playerIndex < 0 || playerIndex >= state.players.length || !state.players[playerIndex]) {
        console.error(`Invalid player index for score modification: ${playerIndex}`);
        return;
    }

    // Update state
    const currentScore = state.players[playerIndex].score;
    const newScore = currentScore + amount;
    state.players[playerIndex].score = newScore;

    // Update display
    updateScoreDisplay(playerIndex, newScore);
}

// Handles clicks on the manual + / - score buttons
function handleManualScoreUpdate(event, playerIndex, amount) {
    event.stopPropagation(); // Prevent turn change click

    // Basic validation of the amount passed
    if (isNaN(amount)) {
        console.error(`Manual Score Error: Invalid amount (${amount}) passed for player ${playerIndex}.`);
        return;
    }

    // Log the direct action
    console.log(`Manual score update: Player=${playerIndex}, Amount=${amount}`);

    // Directly modify the score with the passed amount
    modifyPlayerScore(playerIndex, amount);
}



// --- Turn Management ---

/**
 * Applies end-of-turn passive effects (curses, card effects) to ALL players.
 * This runs silently before the turn indicator moves to the next player.
 * Handles Soul Burst charging based on points lost.
 */
function applyEndOfTurnEffectsForAllPlayers() {
    console.log("[applyEndOfTurnEffects] START - Applying effects for all players.");
    try {
        // 1. Decrement ALL coalition durations FIRST
        state.decrementAllCoalitionDurations();

        // 2. Process effects for each player
        state.players.forEach((player, index) => {
            console.log(`[applyEndOfTurnEffects] Processing Player ${index} (${player?.name || 'N/A'})`);
            if (!player) {
                console.warn(`Skipping effects for missing player at index ${index}`);
                return; // Use continue for forEach equivalent
            }

            // --- Initialize Changes for this Player ---
            let scoreChange = 0;
            let pointsLostToPassivesThisTurn = 0; // For Soul Burst
            let cardToRemoveFromCursesFilename = null; // For Cursed Coin removal

            // --- Decrement Curses (for this player) ---
            state.decrementCurseDurations(index); // Decrement before checking expiry/applying effect
            console.log(` -> Curses after decrement for Player ${index}:`, JSON.parse(JSON.stringify(player.curses || [])));

            // --- Process Curses ---
            if (Array.isArray(player.curses)) {
                player.curses.forEach(curse => {
                    if (curse?.type === 'cursed_coin') {
                        if (curse.remainingTurns >= 0) {
                            const curseLoss = 100;
                            scoreChange -= curseLoss;
                            pointsLostToPassivesThisTurn += curseLoss;
                            console.log(`  -> Cursed Coin EFFECT Applying: -${curseLoss} (Turns now remaining: ${curse.remainingTurns})`);

                            if (curse.remainingTurns <= 0) {
                                console.log(`  -> Cursed Coin marked for removal check (remaining: ${curse.remainingTurns})`);
                                cardToRemoveFromCursesFilename = 'cursed_coin.png';
                            }
                        } else {
                            console.log(`  -> Cursed Coin SKIPPED effect (already expired, remaining: ${curse.remainingTurns})`);
                        }
                    }
                });
            } else { console.warn(`Player ${index} curses array missing/invalid.`); player.curses = []; }

            // --- Process Coalition Point Gain ---
            if (player.coalitionPartnerIndex !== null && player.coalitionTurnsRemaining >= 0) {
                const coalitionGain = 20;
                scoreChange += coalitionGain;
                console.log(` -> Coalition Gain: +${coalitionGain} (Turns left: ${player.coalitionTurnsRemaining})`);
            }

            // --- Process Inventory Passive Effects ---
            if (Array.isArray(player.inventory)) {
                player.inventory.forEach(cardObj => {
                    if (!cardObj || !cardObj.filename) return;
                    const filename = cardObj.filename;
                    const currentScore = player.score + scoreChange;

                    switch (filename) {
                        case 'infinite_money_glitch.png':
                            if (currentScore > 0) {
                                const gain = Math.max(1, Math.ceil(currentScore * 0.01));
                                scoreChange += gain;
                                console.log(` -> Infinite Glitch: +${gain}`);
                            }
                            break;
                        case 'working_sheep.png':
                            scoreChange += 50;
                            console.log(` -> Working Sheep: +50`);
                            break;
                        case 'tick.png':
                            if (currentScore > 0) {
                                const loss = Math.max(1, Math.floor(currentScore * 0.01));
                                scoreChange -= loss;
                                pointsLostToPassivesThisTurn += loss;
                                console.log(` -> Tick: -${loss}`);
                            }
                            break;
                        case 'rotten_sheep.png':
                            scoreChange -= 50;
                            pointsLostToPassivesThisTurn += 50;
                            console.log(` -> Rotten Sheep: -50`);
                            break;
                    }
                });
            } else { console.warn(`Player ${index} inventory missing/invalid.`); player.inventory = []; }

            // --- Charge Soul Burst ---
            if (pointsLostToPassivesThisTurn > 0 && Array.isArray(player.inventory)) {
                let chargedCount = 0;
                player.inventory.forEach(cardInInventory => {
                    if (cardInInventory?.filename === 'soul_burst.png') {
                        cardInInventory.charge = (cardInInventory.charge || 0) + pointsLostToPassivesThisTurn;
                        chargedCount++;
                        console.log(` -> Soul Burst Charged: +${pointsLostToPassivesThisTurn}, New Total: ${cardInInventory.charge} (ID: ${cardInInventory.id || 'N/A'})`);
                    }
                });
            }

            // --- Apply Accumulated Score Changes (If any) ---
            if (scoreChange !== 0) {
                console.log(` -> Applying total score change: ${scoreChange > 0 ? '+' : ''}${scoreChange}`);
                modifyPlayerScore(index, scoreChange);
            } else {
                console.log(` -> No score change this turn for Player ${index}.`);
            }

            // --- Remove Expired Curses ---
            state.removeExpiredCurses(index);
            console.log(` -> Curses after removal check for Player ${index}:`, JSON.parse(JSON.stringify(player.curses || [])));

            // --- Remove Associated Card if Curse Expired ---
            if (cardToRemoveFromCursesFilename) {
                console.log(` -> Attempting removal of ${cardToRemoveFromCursesFilename} card.`);
                const removed = state.removeCardFromPlayerInventory(index, cardToRemoveFromCursesFilename);
                if (removed) {
                    updatePlayerInventoryDisplay(index);
                    console.log(` -> Successfully removed ${cardToRemoveFromCursesFilename} card.`);
                } else {
                    console.warn(` -> Failed to remove ${cardToRemoveFromCursesFilename} card.`);
                }
            }

        });

        // 3. Cleanup expired COALITIONS
        state.cleanupExpiredCoalitions();

    } catch (error) {
        console.error("!!! ERROR within applyEndOfTurnEffectsForAllPlayers:", error);
    }
    console.log("[applyEndOfTurnEffects] END - Finished applying effects.");
}

/**
 * Advances the turn to the next player, applying end-of-turn effects first.
 * Called automatically after a question is finished.
 */
export function nextTurn() {
    applyEndOfTurnEffectsForAllPlayers();
    clearCategoryHighlights();

    if (state.players.length > 0) {
        const newIndex = (state.currentPlayerIndex + 1) % state.players.length;
        state.setCurrentPlayerIndex(newIndex);
        console.log(`--- Turn advanced to Player ${newIndex} (${state.players[newIndex]?.name || 'Unknown'}) ---`);
        updateTurnIndicator();

        if (state.isSeerPeeking) {
            cancelSeerPeekMode();
        }
    } else {
        console.warn("Next turn called with no players.");
    }
}

/**
 * Handles manually clicking on a player card to change the active turn.
 */
function handlePlayerCardClick(event) {
    console.log("--- handlePlayerCardClick Triggered ---");
    console.log("Clicked Element:", event.target);
    console.log("Current Target (Player Card):", event.currentTarget);

    const clickedButton = event.target.closest('.score-buttons button');
    const clickedIcon = event.target.closest('.inventory-button-icon');
    if (clickedButton || clickedIcon) {
        console.log("Click ignored: Clicked on button or icon.");
        return;
    }

    const isAlreadyActive = event.currentTarget.classList.contains('active-turn');
    if (isAlreadyActive) {
        console.log("Click ignored: Clicked on already active player.");
        return;
    }

    const clickedCard = event.currentTarget;
    const playerIndex = parseInt(clickedCard.dataset.playerIndex);

    console.log(`Target Player Index: ${playerIndex}`);

    if (!isNaN(playerIndex) && playerIndex >= 0 && playerIndex < state.players.length) {
        console.log("Index valid. Proceeding with turn change...");
        console.log("Calling applyEndOfTurnEffectsForAllPlayers()...");
        applyEndOfTurnEffectsForAllPlayers();
        console.log("Returned from applyEndOfTurnEffectsForAllPlayers().");

        console.log("Calling clearCategoryHighlights()...");
        clearCategoryHighlights();
        console.log("Returned from clearCategoryHighlights().");

        console.log(`Calling state.setCurrentPlayerIndex(${playerIndex})...`);
        state.setCurrentPlayerIndex(playerIndex);
        console.log(`Current player index is now ${state.currentPlayerIndex}.`);

        console.log("Calling updateTurnIndicator()...");
        updateTurnIndicator();
        console.log("Returned from updateTurnIndicator().");

        if (state.isSeerPeeking) {
            console.log("Calling cancelSeerPeekMode()...");
            cancelSeerPeekMode();
            console.log("Returned from cancelSeerPeekMode().");
        }
        console.log("--- handlePlayerCardClick Finished Successfully ---");
    } else {
        console.error("Could not determine player index OR index out of bounds from clicked card:", clickedCard.dataset.playerIndex);
    }
}

/**
 * Updates player card styles to show the active turn and highlights
 * the forced category on the board if applicable for the current player.
 */
export function updateTurnIndicator() {
    document.querySelectorAll('.player-card.active-turn').forEach(card => card.classList.remove('active-turn'));
    clearCategoryHighlights();

    if (state.players.length > 0 && state.players[state.currentPlayerIndex]) {
        const currentPlayerIndex = state.currentPlayerIndex;
        const currentPlayer = state.players[currentPlayerIndex];
        const currentCardElement = document.getElementById(`player-card-${currentPlayerIndex}`);

        if (currentCardElement) {
            currentCardElement.classList.add('active-turn');
        }

        if (currentPlayer.forcedCategoryIndex !== null) {
            const forcedIndex = currentPlayer.forcedCategoryIndex;
            console.log(`[Turn Indicator] Player ${currentPlayerIndex} is forced into category ${forcedIndex}. Applying highlight.`);
            if (DOM.questionsGrid) {
                const columns = DOM.questionsGrid.querySelectorAll('.category-column');
                if (columns && columns.length > forcedIndex && columns[forcedIndex]) {
                    columns[forcedIndex].classList.add('forced-category');
                    if (DOM.body) DOM.body.classList.add('forced-active');
                } else {
                    console.warn(`[Turn Indicator] Could not find category column element for index ${forcedIndex} to highlight.`);
                }
            }
        }
    }
}