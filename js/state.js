// js/state.js
import { baseScoreIncrement, STARTING_SCORE, allQuizzes } from './config.js'; // <--- 

export let players = [];
export let currentPlayerIndex = 0;
export let currentAnswer = '';
export let isFrogChoosing = false;
export let infoModalCallback = null;
export let isSeerPeeking = false;
export let seerPeekTargetChest = null;
export let frogMultipliers = new Map(); // Stores chestElement -> multiplier
export let currentQuestionBasePoints = 0;
export let currentQuestionMultiplier = 1;
export let selectedQuizData = null;
export const scoreIncrement = baseScoreIncrement; // Use config value

// --- NEW: Function to set the chosen quiz ---
export function setSelectedQuizData(quizKey) {
    if (allQuizzes[quizKey]) {
        selectedQuizData = allQuizzes[quizKey];
        console.log(`[State] Selected quiz set: ${selectedQuizData.displayName}`);
    } else {
        console.error(`[State] Invalid quiz key selected: ${quizKey}`);
        selectedQuizData = null; // Ensure it's null if invalid
    }
}


// --- State Modifier Functions ---

export function setPlayers(newPlayers) {
    players = newPlayers.map(player => ({
        ...player,
        score: player.score || 0,
        inventory: player.inventory || [],
        infiniteMoneyGlitchCount: player.infiniteMoneyGlitchCount || 0,
        tickCardCount: player.tickCardCount || 0,
        forcedCategoryIndex: player.forcedCategoryIndex !== undefined ? player.forcedCategoryIndex : null, // Preserve existing or default to null
        curses: player.curses || [], // *** ENSURE curses is initialized ***
        hasUsedTurnPower: player.hasUsedTurnPower || false, // Ensure this is also initialized
        coalitionPartnerIndex: player.coalitionPartnerIndex !== undefined ? player.coalitionPartnerIndex : null, // Index of partner, null if none
        coalitionTurnsRemaining: player.coalitionTurnsRemaining || 0, // Turns left for the coalition
    }));
    console.log("Players set in state (with Coalition initialized):", players);
    console.log("Players set in state (with Soul Burst initialized):", players);
}

// --- NEW COALITION FUNCTIONS ---

/**
 * Forms a coalition between two players.
 * @param {number} playerAIndex Index of the first player.
 * @param {number} playerBIndex Index of the second player.
 * @param {number} duration Duration of the coalition in turns.
 */
export function formCoalition(playerAIndex, playerBIndex, duration) {
    if (players[playerAIndex] && players[playerBIndex]) {
        // Set for Player A
        players[playerAIndex].coalitionPartnerIndex = playerBIndex;
        players[playerAIndex].coalitionTurnsRemaining = duration;

        // Set for Player B
        players[playerBIndex].coalitionPartnerIndex = playerAIndex;
        players[playerBIndex].coalitionTurnsRemaining = duration;

        console.log(`[State] Coalition formed between Player ${playerAIndex} and Player ${playerBIndex} for ${duration} turns.`);
    } else {
        console.error(`Cannot form coalition: Invalid player indices (${playerAIndex}, ${playerBIndex})`);
    }
}

export function decrementAllCoalitionDurations() {
    let coalitionsDecremented = 0;
    players.forEach(player => {
        if (player.coalitionPartnerIndex !== null && player.coalitionTurnsRemaining > 0) {
            player.coalitionTurnsRemaining--;
            coalitionsDecremented++;
        }
    });
    // Divide by 2 because each coalition involves two players
    // if (coalitionsDecremented > 0) {
    //     console.log(`[State] Decremented duration for ${coalitionsDecremented / 2} active coalitions.`);
    // }
}

export function cleanupExpiredCoalitions() {
    const playersToReset = new Set(); // Keep track of players already reset to avoid double work

    players.forEach((player, index) => {
        if (playersToReset.has(index)) return; // Skip if already handled via partner

        if (player.coalitionPartnerIndex !== null && player.coalitionTurnsRemaining <= 0) {
            const partnerIndex = player.coalitionPartnerIndex;

            console.log(`[State] Coalition expired between Player ${index} and Player ${partnerIndex}. Resetting state.`);

            // Reset current player
            player.coalitionPartnerIndex = null;
            player.coalitionTurnsRemaining = 0;
            playersToReset.add(index);

            // Reset partner
            if (players[partnerIndex]) {
                players[partnerIndex].coalitionPartnerIndex = null;
                players[partnerIndex].coalitionTurnsRemaining = 0;
                playersToReset.add(partnerIndex);
            } else {
                 console.warn(`[State] Coalition partner ${partnerIndex} not found during cleanup for player ${index}.`);
            }

            // Optional: Trigger an Info Modal? Be careful not to spam modals.
            // Consider adding a flag and showing one modal at the end of the turn if any coalitions expired.
        }
    });
}

/**
 * Checks if two players are currently in an active coalition.
 * @param {number} playerIndex1 Index of the first player.
 * @param {number} playerIndex2 Index of the second player.
 * @returns {boolean} True if they are in an active coalition, false otherwise.
 */
export function isInCoalitionWith(playerIndex1, playerIndex2) {
    const player1 = players[playerIndex1];
    const player2 = players[playerIndex2];

    // Check if both players exist, are in a coalition, have turns remaining,
    // and are each other's partner.
    return (
        player1 &&
        player2 &&
        player1.coalitionPartnerIndex === playerIndex2 &&
        player1.coalitionTurnsRemaining > 0 &&
        player2.coalitionPartnerIndex === playerIndex1 &&
        player2.coalitionTurnsRemaining > 0
    );
}

export function setPlayerForcedCategory(playerIndex, categoryIndex) {
    if (players[playerIndex]) {
        players[playerIndex].forcedCategoryIndex = categoryIndex;
        console.log(`[State] Player ${playerIndex} forced into category index ${categoryIndex}.`);
    } else {
        console.error(`Cannot set forced category: Player ${playerIndex} not found.`);
    }
}

export function clearPlayerForcedCategory(playerIndex) {
    if (players[playerIndex]) {
        // Only log if there WAS a restriction to clear
        if (players[playerIndex].forcedCategoryIndex !== null) {
             console.log(`[State] Clearing forced category restriction for player ${playerIndex}.`);
        }
        players[playerIndex].forcedCategoryIndex = null;
    }
    // Don't error if player not found, might be called during cleanup
}

export function setCurrentPlayerIndex(index) {
    if (index >= 0 && index < players.length) {
        currentPlayerIndex = index;
    } else {
        console.error(`Invalid player index attempted: ${index}`);
        currentPlayerIndex = 0; // Reset to first player as a fallback
    }
}

export function clearAllForcedCategories() {
    players.forEach((player, index) => {
        player.forcedCategoryIndex = null;
    });
     console.log("[State] Cleared forced category for all players.");
}

export function addCardToPlayerInventory(playerIndex, cardFilename, isShiny = false) {
    if (players[playerIndex]) {
        if (!Array.isArray(players[playerIndex].inventory)) {
            players[playerIndex].inventory = [];
        }
        // Create the basic card object
        const cardObj = { filename: cardFilename, isShiny: isShiny };
        // *** If it's Soul Burst, add the charge property ***
        if (cardFilename === 'soul_burst.png') {
            cardObj.charge = 0;
            // *** Assign the unique ID HERE ***
            cardObj.id = `sb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            console.log(`[State] Added Soul Burst with initial charge 0 and ID ${cardObj.id}.`);
        }
        // *** End Soul Burst specific add ***

        players[playerIndex].inventory.push(cardObj);
        console.log(`[State] Added card to player ${playerIndex}. New inventory:`, JSON.parse(JSON.stringify(players[playerIndex].inventory)));
    } else {
        console.error(`Cannot add card to inventory: Player ${playerIndex} not found.`);
    }
}

// --- REVISED: Removes the FIRST instance matching the filename ---
// The inventory modal decides *which* specific card (shiny/non-shiny)
// the remove button corresponds to, but this function just removes *one* match.
export function removeCardFromPlayerInventory(playerIndex, cardIdentifier) {
    // cardIdentifier can be filename (old behavior) or a unique ID (new)

    console.log(`[State Remove Attempt] Player ${playerIndex}, Identifier "${cardIdentifier}"`);

    if (!players[playerIndex] || !Array.isArray(players[playerIndex].inventory)) {
        console.error(`[State Remove] Cannot remove card: Player ${playerIndex} or inventory not found.`);
        return false;
    }

    const inventory = players[playerIndex].inventory;
    let cardIndexToRemove = -1;

    // Try finding by ID first (if identifier looks like an ID)
    if (typeof cardIdentifier === 'string' && cardIdentifier.startsWith('sb_')) { // Example ID prefix
         cardIndexToRemove = inventory.findIndex(cardObj => cardObj.id === cardIdentifier);
         console.log(`[State Remove] Attempting removal by ID "${cardIdentifier}", Index found: ${cardIndexToRemove}`);
    }

    // If not found by ID, or if identifier was just a filename, try finding first match by filename
    if (cardIndexToRemove === -1 && typeof cardIdentifier === 'string') {
        cardIndexToRemove = inventory.findIndex(cardObj => cardObj.filename === cardIdentifier);
        console.log(`[State Remove] Attempting removal by filename "${cardIdentifier}", Index found: ${cardIndexToRemove}`);
    }

    // If still not found (maybe identifier was an object?)
    if (cardIndexToRemove === -1 && typeof cardIdentifier === 'object' && cardIdentifier !== null) {
        // This requires comparing objects, which can be tricky.
        // Simplest is to find by reference if the exact object was passed.
        cardIndexToRemove = inventory.indexOf(cardIdentifier);
         console.log(`[State Remove] Attempting removal by object reference, Index found: ${cardIndexToRemove}`);
    }


    console.log(`[State Remove] Final Index to remove: ${cardIndexToRemove}`);

    if (cardIndexToRemove > -1) {
        const removedCard = inventory.splice(cardIndexToRemove, 1)[0]; // Remove 1 element and get it
        console.log(`[State Remove] SUCCESS: Removed card (Filename: ${removedCard?.filename}, ID: ${removedCard?.id}) from player ${playerIndex}. New inventory:`, JSON.parse(JSON.stringify(inventory)));
        return true; // Indicate success
    } else {
        console.warn(`[State Remove] FAILURE: Card identifier '${cardIdentifier}' not found in player ${playerIndex}'s inventory.`);
        return false; // Indicate failure: Card not found
    }
}

// Add a function to reset the charge after use
export function resetSoulBurstCharge(playerIndex) {
     if (players[playerIndex]) {
        const oldCharge = players[playerIndex].soulBurstCharge || 0;
        if (oldCharge > 0) { // Only log if there was a charge
             players[playerIndex].soulBurstCharge = 0;
            console.log(`[State] Reset Soul Burst Charge for player ${playerIndex} from ${oldCharge} to 0.`);
        }
     } else {
         console.error(`Cannot reset Soul Burst Charge: Player ${playerIndex} not found.`);
     }
}

// --- Score and Curse Management ---

export function updatePlayerScore(playerIndex, amount) {
    if (players[playerIndex]) {
        const oldScore = players[playerIndex].score;
        players[playerIndex].score += amount;
        console.log(`[State] Updated score for player ${playerIndex}: ${oldScore} -> ${players[playerIndex].score} (Change: ${amount})`);
    } else {
        console.error(`Cannot update score: Player ${playerIndex} not found.`);
    }
}

export function addCurseToPlayer(playerIndex, curseType, duration) {
    if (players[playerIndex]) {
        // Ensure curses array exists (should be guaranteed by setPlayers/initializePlayerState)
        if (!Array.isArray(players[playerIndex].curses)) {
            players[playerIndex].curses = [];
            console.warn(`[State] Player ${playerIndex} curses array was missing, re-initialized.`);
        }
        const newCurse = { type: curseType, remainingTurns: duration };
        players[playerIndex].curses.push(newCurse);
        console.log(`[State] Added curse ${JSON.stringify(newCurse)} to player ${playerIndex}. Current curses:`, JSON.parse(JSON.stringify(players[playerIndex].curses)));
    } else {
        console.error(`Cannot add curse: Player ${playerIndex} not found.`);
    }
}

export function decrementCurseDurations(playerIndex) {
    if (players[playerIndex] && Array.isArray(players[playerIndex].curses)) {
        players[playerIndex].curses.forEach(curse => {
            if (curse.remainingTurns > 0) {
                curse.remainingTurns--;
            }
        });
        // Optionally log the state after decrementing
        // console.log(`[State] Decremented curse durations for player ${playerIndex}. Current curses:`, JSON.parse(JSON.stringify(players[playerIndex].curses)));
    }
}

export function removeExpiredCurses(playerIndex) {
     if (players[playerIndex] && Array.isArray(players[playerIndex].curses)) {
        const initialCount = players[playerIndex].curses.length;
        players[playerIndex].curses = players[playerIndex].curses.filter(curse => curse.remainingTurns > 0);
        const finalCount = players[playerIndex].curses.length;
        if (initialCount > finalCount) {
            console.log(`[State] Removed ${initialCount - finalCount} expired curses for player ${playerIndex}. Current curses:`, JSON.parse(JSON.stringify(players[playerIndex].curses)));
        }
    }
}

// --- END Score and Curse Management ---

export function incrementPlayerInfiniteMoneyGlitch(playerIndex) {
    if (players[playerIndex]) {
        // Check value BEFORE incrementing
        const currentCount = players[playerIndex].infiniteMoneyGlitchCount || 0;
        players[playerIndex].infiniteMoneyGlitchCount = currentCount + 1;
        // Log BEFORE and AFTER
        console.log(`[State DEBUG] Player ${playerIndex} Glitch BEFORE: ${currentCount}, AFTER: ${players[playerIndex].infiniteMoneyGlitchCount}`);
    } else {
        console.error(`Cannot increment Infinite Money Glitch: Player ${playerIndex} not found.`);
    }
}

export function incrementPlayerTickCard(playerIndex) {
     if (players[playerIndex]) {
        // Check value BEFORE incrementing
        const currentCount = players[playerIndex].tickCardCount || 0;
        players[playerIndex].tickCardCount = currentCount + 1;
        // Log BEFORE and AFTER
        console.log(`[State DEBUG] Player ${playerIndex} Tick BEFORE: ${currentCount}, AFTER: ${players[playerIndex].tickCardCount}`);
    } else {
        console.error(`Cannot increment Tick Card: Player ${playerIndex} not found.`);
    }
}
// --- END CHANGE FUNCTIONS ---

export function setCurrentAnswer(answer) {
    currentAnswer = answer;
}

export function setFrogChoosing(value) {
    isFrogChoosing = Boolean(value);
}

export function setInfoModalCallback(callback) {
    infoModalCallback = callback;
}

export function setSeerPeeking(value) {
    isSeerPeeking = Boolean(value);
}

export function setSeerPeekTargetChest(chestElement) {
    seerPeekTargetChest = chestElement;
}

export function setChestMultiplier(chestElement, multiplier) {
    if (multiplier > 1) {
        frogMultipliers.set(chestElement, multiplier);
    } else {
        frogMultipliers.delete(chestElement); // Remove if multiplier is 1 or less
    }
}

export function getChestMultiplier(chestElement) {
    return frogMultipliers.get(chestElement) || 1; // Default to 1 if not found
}

export function deleteChestMultiplier(chestElement) {
    frogMultipliers.delete(chestElement);
}

export function clearFrogMultipliers() {
    frogMultipliers.clear();
}

export function setCurrentQuestionParams(basePoints, multiplier) {
    currentQuestionBasePoints = basePoints || 0;
    currentQuestionMultiplier = multiplier || 1;
}

export function resetCurrentQuestionParams() {
    currentQuestionBasePoints = 0;
    currentQuestionMultiplier = 1;
}

export function initializePlayerState(names) {
    players = names.map((name, index) => ({ // Add index here
        name: name,
        score: STARTING_SCORE,
        inventory: [],
        hasUsedTurnPower: false,
        curses: [],
        infiniteMoneyGlitchCount: 0,
        tickCardCount: 0,
        forcedCategoryIndex: null,
        coalitionPartnerIndex: null, // Initialize new prop
        coalitionTurnsRemaining: 0, // Initialize new prop
        id: `player_${index}_${Math.random().toString(36).substr(2, 9)}` // Example ID
    }));
    currentPlayerIndex = 0;
    console.log(`Initialized player state with starting score ${STARTING_SCORE}:`, players);
}

export function resetGameState() {
    console.log("Resetting game state...");
    players.forEach(player => {
        player.score = STARTING_SCORE;
        player.inventory = [];
        player.hasUsedTurnPower = false;
        player.curses = [];
        player.infiniteMoneyGlitchCount = 0;
        player.tickCardCount = 0;
        player.forcedCategoryIndex = null;
        player.coalitionPartnerIndex = null; // Reset new prop
        player.coalitionTurnsRemaining = 0; // Reset new prop
    });
    selectedQuizData = null; // Reset global quiz selection here
    currentPlayerIndex = 0;
    currentAnswer = '';
    isFrogChoosing = false;
    infoModalCallback = null;
    isSeerPeeking = false;
    seerPeekTargetChest = null;
    frogMultipliers.clear();
    currentQuestionBasePoints = 0;
    currentQuestionMultiplier = 1;
    // ... (reset other global state variables if needed) ...
    console.log("Game state reset complete.");
}