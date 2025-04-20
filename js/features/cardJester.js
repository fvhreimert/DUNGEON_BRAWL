// js/features/cardJester.js
import * as state from '../state.js';
import * as config from '../config.js';
import { showCard } from '../modals/cardModal.js';
import { showInfoModal } from '../modals/infoModal.js';
import { cancelSeerPeekMode } from './seer.js';
import { modifyPlayerScore, updatePlayerInventoryDisplay } from '../player.js';
import { getCardDataByFilename } from '../utils.js'; // Keep this
import { addCurseToPlayer } from '../state.js'; // Ensure addCurseToPlayer is imported

const JESTER_COST = 75;

// --- NEW: Event Handler Functions ---

export function handlePimpEvent() {
    console.log("EVENT TRIGGERED: Pimp My Sheep!");
    let sheepTransformed = false;

    state.players.forEach((player, index) => {
        let playerChanged = false;
        if (!Array.isArray(player.inventory)) return; // Skip if inventory isn't an array

        player.inventory.forEach(cardObj => {
            // Check the filename property of the object
            if (cardObj.filename === 'sheep.png') {
                console.log(`Pimping sheep for player ${index} (${player.name})`);
                cardObj.filename = 'working_sheep.png'; // Modify the object directly
                playerChanged = true;
                sheepTransformed = true;
            }
        });

        if (playerChanged) {
            updatePlayerInventoryDisplay(index);
        }
    });

    const message = sheepTransformed
        ? "A strange benefactor has appeared! All Sheep across the realm are now Working Sheep, generating points!"
        : "A strange benefactor looks around... but finds no Sheep to 'pimp'.";
    showInfoModal("Pimp My Sheep!", message);
}

export function handlePlagueEvent() {
    console.log("EVENT TRIGGERED: Sheep Plague!");
    let sheepInfected = false;

    state.players.forEach((player, index) => {
        let playerChanged = false;
         if (!Array.isArray(player.inventory)) return; // Skip if inventory isn't an array

        player.inventory.forEach(cardObj => {
            // Check the filename property of the object
            if (cardObj.filename === 'sheep.png') {
                console.log(`Infecting sheep for player ${index} (${player.name})`);
                cardObj.filename = 'rotten_sheep.png'; // Modify the object directly
                playerChanged = true;
                sheepInfected = true;
            }
        });

        if (playerChanged) {
            updatePlayerInventoryDisplay(index);
        }
    });

    const message = sheepInfected
        ? "A vile plague sweeps the land! All normal Sheep have become Rotten Sheep, draining points!"
        : "A vile plague sweeps the land... but thankfully, no Sheep were around to be infected.";
    showInfoModal("Sheep Plague!", message);
}

// --- MODIFIED handleDrawCard ---
export function handleDrawCard() {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;
    if (currentPlayer.score < JESTER_COST) {
        showInfoModal("Not Enough Points!", `The Card Jester demands ${JESTER_COST} points...`);
        return;
    }
    if (state.isFrogChoosing || state.isSeerPeeking) return;

    const drawableCards = config.cardsData.filter(card => card.weight > 0);
    if (drawableCards.length === 0) {
        showInfoModal("Empty Deck", "The Deck has no drawable cards left!");
        return;
    }

    const totalWeight = drawableCards.reduce((sum, card) => sum + card.weight, 0);
    if (totalWeight <= 0) {
        console.error("Card Jester Error: Total weight of drawable cards is zero.");
        showInfoModal("Odd Deck", "The cards seem weightless... Jester is confused.");
        return;
    }

    let randomWeight = Math.random() * totalWeight;
    let chosenCard = null;
    for (const card of drawableCards) {
        randomWeight -= card.weight;
        if (randomWeight <= 0) {
            chosenCard = card;
            break;
        }
    }
    if (!chosenCard) {
        chosenCard = drawableCards[drawableCards.length - 1];
        console.warn("Card Jester: Weighted selection fallback triggered.");
    }

    // *** Determine if the card is shiny ***
    const isShiny = Math.random() < 0.02; // 2% chance (1 in 50)
    console.log(`Card drawn: ${chosenCard.title} (Shiny: ${isShiny})`);

    // --- Proceed with chosenCard ---
    modifyPlayerScore(state.currentPlayerIndex, -JESTER_COST);
    console.log(`Player ${currentPlayer.name} paid ${JESTER_COST} points.`);

    // *** Pass isShiny status to showCard ***
    showCard(chosenCard, isShiny); // Show the chosen card (potentially shiny)

    if (chosenCard.type === 'Event') {
        // Event logic (handled by cardModal close) remains the same
        // No need to add Event cards to inventory
    } else {
        // Normal Card Logic
        // *** Pass isShiny status when adding to inventory ***
        state.addCardToPlayerInventory(state.currentPlayerIndex, chosenCard.filename, isShiny);
        // Apply instant effect (if any) - doesn't depend on shininess
        applyCardEffect(state.currentPlayerIndex, chosenCard.filename);
        // Update inventory display (might be needed if icons were visible)
        updatePlayerInventoryDisplay(state.currentPlayerIndex);
    }
}

// applyCardEffect handles INSTANT effects on draw for non-event cards
// Passive effects are handled in player.js turn logic
function applyCardEffect(playerIndex, cardFilename) {
    const cardData = getCardDataByFilename(cardFilename);
    const player = state.players[playerIndex];
    const playerName = player?.name || 'The player';

    if (!player || !cardData) {
        console.error(`applyCardEffect: Invalid player or cardData for index ${playerIndex}, filename ${cardFilename}`);
        return;
    }

    console.log(`Applying instant draw effect (if any) for card: ${cardFilename} (${cardData.title})`);

    switch (cardFilename) {
        // Example: If you wanted an instant +10 card
        // case 'minor_blessing.png':
        //     modifyPlayerScore(playerIndex, 10);
        //     showInfoModal("Blessed!", "+10 points!", 500);
        //     break;

        case 'cursed_coin.png':
            modifyPlayerScore(playerIndex, 1000); // Correct instant gain
            // Add the curse state to the player using the state function
            addCurseToPlayer(playerIndex, 'cursed_coin', 10); // Add curse with 10 turns duration
            console.log(`${playerName} received Cursed Coin curse. Duration: 10 turns.`);
            break;

        // We removed the instant sheep effect, so nothing needed here for sheep.png
        // Passive effects (tick, glitch, working/rotten sheep) are handled by player.js

        default:
            // console.log(`No specific *instant* effect on draw for card: ${cardFilename}`);
            break;
    }
}