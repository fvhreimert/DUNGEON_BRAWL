// js/modals/inventoryModal.js

import * as DOM from '../domElements.js';
import * as state from '../state.js';
import * as config from '../config.js';
import { showInfoModal } from './infoModal.js';
import { prepareAndShowPlayerSelectModal } from './playerSelectModal.js';
import { modifyPlayerScore, updatePlayerInventoryDisplay } from '../player.js';
import { showRouletteModal } from './rouletteModal.js';
import { showTreasureMapModal } from './treasureMapModal.js';
import { showCategorySelectModal } from './categorySelectModal.js';
import { buildCardElement, getCardDataByFilename } from '../utils.js';

// --- Module-level variables for multi-step actions ---
let activatingPlayerIndex = -1;
let activatingSoulBurstCardId = null; // Store ID of specific Soul Burst being used

// --- DOM Elements ---
const inventoryModal = DOM.inventoryModal;
const inventoryModalTitle = DOM.inventoryModalTitle;
const inventoryCardsContainer = DOM.inventoryCardsContainer;
const inventoryCloseBtn = DOM.inventoryCloseBtn;
const inventoryModalContent = DOM.inventoryModalContent;


// js/modals/inventoryModal.js
// ... (imports including state, config, utils, etc.) ...

// --- Displays the inventory modal for a given player ---
export function showInventoryModal(playerIndex) {
    if (!inventoryModal || !inventoryModalTitle || !inventoryCardsContainer) {
        console.error("Cannot show inventory modal: Required DOM elements missing.");
        return;
    }

    const player = state.players[playerIndex];
    if (!player) {
        console.error(`Cannot show inventory: Player with index ${playerIndex} not found in state.`);
        return;
    }

    inventoryModalTitle.textContent = `${player.name}'s Inventory`;
    inventoryCardsContainer.innerHTML = ''; // Clear previous items

    if (!player.inventory || !Array.isArray(player.inventory) || player.inventory.length === 0) {
        inventoryCardsContainer.textContent = "Inventory is empty.";
        inventoryCardsContainer.style.textAlign = "center";
        inventoryModal.style.display = 'flex';
        return;
    }

    // --- Card Grouping Logic (from previous correct implementation) ---
    const cardGroups = new Map();
    const exceptions = new Set(['soul_burst.png', 'cursed_coin.png']);
    const displayOrder = [];

    player.inventory.forEach((cardInInventory) => {
        const filename = cardInInventory.filename;
        const isException = exceptions.has(filename);
        const cardIdentifier = (filename === 'soul_burst.png' && cardInInventory.id) ? cardInInventory.id :
                               isException ? `${filename}_${Date.now()}_${Math.random()}` :
                               `${filename}_${cardInInventory.isShiny || false}`;

        if (!cardGroups.has(cardIdentifier)) {
            const cardObject = getCardDataByFilename(filename);
            if (!cardObject) {
                console.warn(`Inventory: Could not find card data for filename: ${filename}`);
                return;
            }
            cardGroups.set(cardIdentifier, {
                cardData: cardObject,
                count: 1,
                isShiny: cardInInventory.isShiny || false,
                cardId: (filename === 'soul_burst.png') ? cardInInventory.id : null
            });
            displayOrder.push(cardIdentifier);
        } else if (!isException) {
            cardGroups.get(cardIdentifier).count++;
        }
    });
    // --- End Grouping Logic ---

    // --- Display Logic ---
    if (displayOrder.length === 0) {
         inventoryCardsContainer.textContent = player.inventory.length > 0 ? "Error processing inventory." : "Inventory is empty.";
         inventoryCardsContainer.style.textAlign = "center";
    } else {
        displayOrder.forEach(identifier => {
            const group = cardGroups.get(identifier);
            if (!group) return;

            // Prepare Data for Display (dynamic descriptions)
            let displayCardData = { ...group.cardData };
            if (displayCardData.filename === 'soul_burst.png') {
                 const originalCardObj = player.inventory.find(c => c.id === group.cardId);
                 const currentCharge = originalCardObj?.charge || 0;
                 displayCardData.description = `Steal *${Math.floor(currentCharge * 0.5)}* points.`;
                 group.cardId = group.cardId || `error_missing_id_${identifier}`;
            } else if (displayCardData.filename === 'cursed_coin.png') {
                 let turnsLeft = '?';
                 if (Array.isArray(player.curses)) {
                     const coinCurse = player.curses.find(curse => curse.type === 'cursed_coin');
                     turnsLeft = coinCurse ? coinCurse.remainingTurns : 0;
                 }
                 displayCardData.description = `Lose 100 points each turn.\n*${turnsLeft}* turns remaining.`;
            }

            // --- Call the REVISED buildCardElement ---
            const cardElement = buildCardElement(displayCardData, {
                isInventoryItem: true,
                playerIndex: playerIndex,
                showRemoveButton: true,
                isShiny: group.isShiny,
                count: group.count, // Pass the count
                cardId: group.cardId // Pass ID if exists
            });
            // --- End Call ---

            // Add Data Attributes
            cardElement.dataset.filename = group.cardData.filename;
             if (group.cardId) {
                cardElement.dataset.cardId = group.cardId;
            }

            // Add Click Listener
            if (config.activeCards.has(group.cardData.filename)) {
                // Note: The active-card class is now added *inside* buildCardElement
                cardElement.addEventListener('click', handleActivateCardClick);
            }

            inventoryCardsContainer.appendChild(cardElement);
        });
    }

    inventoryModal.style.display = 'flex';
}

// ... (rest of inventoryModal.js) ...


function handleActivateCardClick(event) {
    const cardWrapper = event.currentTarget;
    const cardFilename = cardWrapper.dataset.filename;
    const playerIndex = parseInt(cardWrapper.dataset.playerIndex);
    const cardId = cardWrapper.dataset.cardId; // Unique ID for Soul Burst

    // Basic validation
    if (isNaN(playerIndex) || !cardFilename) {
        console.error("Card Activation Error: Missing player index or filename on card element.");
        return;
    }

    console.log(`Attempting to activate card '${cardFilename}' (ID: ${cardId || 'N/A'}) for player ${playerIndex}`);

    // --- Context Handling: Set context ONLY for cards that need subsequent steps ---
    activatingPlayerIndex = -1; // Reset context by default
    activatingSoulBurstCardId = null; // Reset specific ID by default

    const needsContext = ['thieving_rat.png', 'puppet_master.png', 'card_gobbler.png', 'soul_burst.png', 'loot_goblin.png','coalition.png'].includes(cardFilename);

    if (needsContext) {
        activatingPlayerIndex = playerIndex; // Set the general context index
        console.log(`Stored activatingPlayerIndex: ${activatingPlayerIndex} for ${cardFilename}`);
        if (cardFilename === 'soul_burst.png' && cardId) {
            activatingSoulBurstCardId = cardId; // Set the specific Soul Burst ID
            console.log(`Stored activatingSoulBurstCardId: ${activatingSoulBurstCardId}`);
        }
    }
    // --- End Context Handling ---


    // Close the inventory modal immediately after clicking an active card
    // The closeInventoryModal function also safely resets context variables.
    // closeInventoryModal(); // <--- REMOVE THIS LINE


    // --- Handle Specific Card Activations ---

    // Handle Treasure Map pieces first (these don't use the standard context)
    if (['shovel.png', 'treasure_map.png', 'compass.png'].includes(cardFilename)) {
        closeInventoryModal(); // Close inventory *before* showing treasure map
        showTreasureMapModal(playerIndex);
        return; // Activation handled by the Treasure Map modal
    }

    // Switch for other active cards
    switch (cardFilename) {
        // --- Direct Activation Cards (Pass playerIndex directly) ---
        case 'loot_goblin.png':
            closeInventoryModal(); // Close inventory *before* showing player select
            activateLootGoblin(playerIndex);
            break;
        case 'roulette.png':
            closeInventoryModal(); // Close inventory *before* showing roulette
            activateRoulette(playerIndex);
            break;
        case 'spiny_shell.png':
            closeInventoryModal(); // Close immediately for instant effects
            activateSpinyShell(playerIndex);
            break;

        // --- Multi-Step Activation Cards (Rely on module-level context set above) ---
        case 'puppet_master.png':
            closeInventoryModal(); // Close inventory *before* showing player select
            activatePuppetMaster();
            break;
        case 'card_gobbler.png':
            closeInventoryModal(); // Close inventory *before* showing player select
            activateCardGobbler();
            break;
        case 'soul_burst.png':
            closeInventoryModal(); // Close inventory *before* showing player select
            activateSoulBurst(activatingSoulBurstCardId);
            break;
        case 'coalition.png':
            closeInventoryModal(); // Close inventory *before* showing player select
            activateCoalition(playerIndex); // Pass the activating player's index
            break;
        case 'thieving_rat.png':
            closeInventoryModal(); // Close inventory *before* showing player select
            activateThievingRat(playerIndex); // Pass the activating player's index
            break;
        case 'amethyst.png':
        case 'sapphire.png':
        case 'emerald.png':
        case 'ruby.png':
        case 'sunstone.png':
            closeInventoryModal(); // Close inventory *before* activating
            activateGemCard(playerIndex, cardFilename); // Pass player index and the specific gem filename
            break;

        // --- Default Case ---
        default:
            console.warn(`Unhandled active card clicked: ${cardFilename}`);
            if (config.activeCards.has(cardFilename)) {
                const cardData = getCardDataByFilename(cardFilename);
                showInfoModal("Under Construction", `Activation logic for ${cardData?.title || 'this card'} is TBD.`);
            }
            // Reset context here if default is reached
            activatingPlayerIndex = -1;
            activatingSoulBurstCardId = null;
            closeInventoryModal(); // Close if it's an unhandled active card
            break;
    }
}

function activateGemCard(playerIndex, gemFilename) {
    console.log(`Activating Gem: ${gemFilename} for player ${playerIndex}`);
    const player = state.players[playerIndex];
    if (!player) {
        console.error("Gem Activation Error: Player not found", playerIndex);
        return;
    }

    // Determine points and name based on the filename
    let pointsToAdd = 0;
    let gemName = 'Gem'; // Default/fallback name
    switch (gemFilename) {
        case 'amethyst.png': pointsToAdd = 100; gemName = 'Amethyst'; break;
        case 'sapphire.png': pointsToAdd = 125; gemName = 'Sapphire'; break;
        case 'emerald.png':  pointsToAdd = 150; gemName = 'Emerald'; break;
        case 'ruby.png':     pointsToAdd = 200; gemName = 'Ruby'; break;
        case 'sunstone.png': pointsToAdd = 250; gemName = 'Sunstone'; break;
        default:
            // This case should ideally not be hit if called from the switch
            console.error(`activateGemCard: Unknown or unexpected gem filename: ${gemFilename}`);
            showInfoModal("Unknown Gem", "Cannot determine the value of this strange gem.");
            // Do NOT consume the card if it's unknown
            return;
    }

    // Apply points
    modifyPlayerScore(playerIndex, pointsToAdd);

    // Consume the specific gem card
    const removed = state.removeCardFromPlayerInventory(playerIndex, gemFilename);
    if (removed) {
        updatePlayerInventoryDisplay(playerIndex); // Update the small icons on player card
    } else {
        // This is problematic - points were awarded, but card wasn't removed.
        console.error(`[Gem Activation] CRITICAL ERROR: Failed to remove ${gemFilename} card from player ${playerIndex} after awarding points.`);
        showInfoModal("Inventory Glitch", `Awarded ${pointsToAdd} points, but couldn't remove the ${gemName}. Please notify the Game Master.`);
        // Consider adding logic to try and subtract points back if removal fails, but that can get complex.
    }

    // Show confirmation
    showInfoModal("Gem Sold!", `${player.name} sold the ${gemName} for ${pointsToAdd} points!`);
}


function activateThievingRat(userIndex) {
    console.log(`[Thieving Rat] Activating card for Player ${userIndex}`);
    const userPlayer = state.players[userIndex];

    if (!userPlayer) {
        console.error("Thieving Rat Error: Activating player not found.", userIndex);
        activatingPlayerIndex = -1; // Reset context
        return;
    }

    // Find potential victims (not self, have cards in inventory)
    const potentialVictims = state.players.filter((p, i) =>
        i !== userIndex && p.inventory && p.inventory.length > 0
    );

    if (potentialVictims.length === 0) {
        showInfoModal("No Loot!", "There's no one with any cards for the rat to steal!");
        activatingPlayerIndex = -1; // Reset context
        // Consume the card even if no targets? Let's say NO for this one.
        return;
    }

    // Set context (should already be set, but good for safety)
    activatingPlayerIndex = userIndex;
    console.log(`[Thieving Rat] Showing player select modal for Player ${userIndex} to choose target.`);
    prepareAndShowPlayerSelectModal(handleThievingRatVictimSelection, "Choose Target for Thieving Rat");
    // activatingPlayerIndex remains set for the callback
}

// --- NEW: Handle Thieving Rat Victim Selection ---
function handleThievingRatVictimSelection(victimIndex) {
    const userIndex = activatingPlayerIndex; // Retrieve stored index
    activatingPlayerIndex = -1; // Reset context immediately

    // Basic validation
    if (userIndex < 0 || victimIndex < 0 || userIndex === victimIndex) {
        console.error("Thieving Rat Error: Invalid indices", { userIndex, victimIndex });
        return;
    }

    const userPlayer = state.players[userIndex];
    const victimPlayer = state.players[victimIndex];

    if (!userPlayer || !victimPlayer) {
        console.error("Thieving Rat Error: Player object not found", { userIndex, victimIndex });
        return;
    }

    // *** ADD COALITION CHECK ***
    if (state.isInCoalitionWith(userIndex, victimIndex)) {
        showInfoModal("Coalition Pact!", `The Thieving Rat respects the coalition and won't steal from ${victimPlayer.name}!`);
        // Card is NOT consumed because we return before removing it.
        return; // Stop the effect
    }
    // *** END CHECK ***

    // Check if victim *still* has cards (could change between modals)
    if (!victimPlayer.inventory || victimPlayer.inventory.length === 0) {
        showInfoModal("Too Slow!", `${victimPlayer.name}'s pockets are empty now!`);
        // Consume the user's card as the action was initiated and target selected.
        const removedRatOnly = state.removeCardFromPlayerInventory(userIndex, 'thieving_rat.png');
        if (removedRatOnly) updatePlayerInventoryDisplay(userIndex);
        return;
    }

    // --- Steal Logic ---
    const victimInventory = victimPlayer.inventory;
    const randomIndex = Math.floor(Math.random() * victimInventory.length);
    const cardToStealObject = victimInventory[randomIndex]; // Get the actual card object

    if (!cardToStealObject || !cardToStealObject.filename) {
        console.error("[Thieving Rat] Error: Could not get valid card object to steal from victim.", victimInventory, randomIndex);
        showInfoModal("Rat Confusion!", "The rat got confused and couldn't grab anything.");
        // Consume user's card? Maybe not if it was an internal error. Let's not for now.
        return;
    }

    const cardFilename = cardToStealObject.filename;
    const wasShiny = cardToStealObject.isShiny;
    const cardBaseData = getCardDataByFilename(cardFilename); // For display

    console.log(`[Thieving Rat] Player ${userIndex} is stealing '${cardFilename}' (Shiny: ${wasShiny}) from Player ${victimIndex}`);

    // 1. Remove card from victim
    //    Ideally, state.removeCardFromPlayerInventory would accept the *object* or a unique ID.
    //    Assuming it removes the first filename match for now:
    const removedFromVictim = state.removeCardFromPlayerInventory(victimIndex, cardFilename);

    if (!removedFromVictim) {
        console.error(`[Thieving Rat] Failed to remove '${cardFilename}' from victim ${victimIndex}. State mismatch?`);
        showInfoModal("Slippery Card!", `Failed to snatch the card from ${victimPlayer.name}. Your rat returns empty-pawed.`);
        // Do NOT consume the user's rat card if the steal failed.
        return;
    }

    // 2. Add card to user
    state.addCardToPlayerInventory(userIndex, cardFilename, wasShiny);

    // 3. Consume the Thieving Rat card from user
    const removedRat = state.removeCardFromPlayerInventory(userIndex, 'thieving_rat.png');
    if (!removedRat) {
        console.error("[Thieving Rat] CRITICAL ERROR: Failed to remove thieving_rat.png card after successful steal.");
        // The steal happened, but the rat card is still there. Might need GM intervention.
    }

    // 4. Update inventory displays
    updatePlayerInventoryDisplay(victimIndex);
    updatePlayerInventoryDisplay(userIndex);

    // 5. Show confirmation modal with card visual
    let stolenCardHTML = '<p>(Stolen Card)</p>';
    if (cardBaseData) {
        const cardEl = buildCardElement(cardBaseData, { isShiny: wasShiny });
        if (cardEl) stolenCardHTML = cardEl.outerHTML;
    }
    const victimName = state.players[victimIndex]?.name || 'The victim';
    const userName = userPlayer.name || 'Someone';
    const messageText = `${userName}'s Thieving Rat scurries away from ${victimName} with:`;
    const finalMessageHTML = `<p style="margin-bottom: 15px;">${messageText}</p><div class="info-modal-eaten-card">${stolenCardHTML}</div>`; // Re-use existing class
    showInfoModal("Snatched!", finalMessageHTML);
}

// --- Make sure the rest of your inventoryModal.js functions (activatePuppetMaster, activateCardGobbler, activateSoulBurst, etc., and the modal setup/close) remain as they were in the previous complete version ---
function activateCoalition(userIndex) {
    console.log(`[Coalition] Activating card for Player ${userIndex}`);
    const userPlayer = state.players[userIndex];

    if (!userPlayer) {
        console.error("Coalition Error: Activating player not found.", userIndex);
        activatingPlayerIndex = -1; // Reset context just in case
        return;
    }

    // Check if user is already in a coalition
    if (userPlayer.coalitionPartnerIndex !== null) {
        showInfoModal("Already Allied", "You are already in a coalition!");
        activatingPlayerIndex = -1; // Reset context
        return;
    }

    // Find potential partners (not self, not already in a coalition)
    const potentialPartners = state.players.filter((p, i) =>
        i !== userIndex && p.coalitionPartnerIndex === null
    );

    if (potentialPartners.length === 0) {
        showInfoModal("No Partners Available", "There's no one available to form a coalition with right now.");
        activatingPlayerIndex = -1; // Reset context
        return;
    }

    // Set context (already done in handleActivateCardClick, but good for clarity)
    activatingPlayerIndex = userIndex;
    console.log(`[Coalition] Showing player select modal for Player ${userIndex} to choose partner.`);
    prepareAndShowPlayerSelectModal(handleCoalitionPartnerSelection, "Choose Coalition Partner (10 Turns)");
    // activatingPlayerIndex remains set for the callback
}


// --- NEW: Handle Partner Selection ---
function handleCoalitionPartnerSelection(partnerIndex) {
    const userIndex = activatingPlayerIndex; // Retrieve stored index

    // Reset context now that we have the needed info
    activatingPlayerIndex = -1;

    // Validate indices
    if (userIndex < 0 || partnerIndex < 0 || userIndex === partnerIndex) {
        console.error("Coalition Partner Selection Error: Invalid indices.", { userIndex, partnerIndex });
        showInfoModal("Error", "Invalid player selected for coalition.");
        return;
    }

    const userPlayer = state.players[userIndex];
    const partnerPlayer = state.players[partnerIndex];

    if (!userPlayer || !partnerPlayer) {
        console.error("Coalition Partner Selection Error: Player objects invalid.", { userIndex, partnerIndex });
        return; // Avoid further errors
    }

    // Final check: Ensure target isn't *now* in a coalition (race condition?)
    if (partnerPlayer.coalitionPartnerIndex !== null) {
        showInfoModal("Too Late!", `${partnerPlayer.name} just formed a coalition with someone else!`);
        // Card is NOT consumed in this case as the action couldn't complete
        return;
    }

    // All checks passed - Form the coalition!
    const coalitionDuration = 10;
    state.formCoalition(userIndex, partnerIndex, coalitionDuration);

    // Consume the card
    const cardRemoved = state.removeCardFromPlayerInventory(userIndex, 'coalition.png');
    if (cardRemoved) {
        updatePlayerInventoryDisplay(userIndex);
    } else {
        console.error("[Coalition] CRITICAL ERROR: Failed to remove coalition.png card from user inventory.");
        // State might be inconsistent here, but proceed with info modal
    }

    // Notify players
    showInfoModal(
        "Coalition Formed!",
        `${userPlayer.name} and ${partnerPlayer.name} have formed a coalition! They cannot target each other and will gain points together for ${coalitionDuration} turns.`
    );
}


// --- FUNCTION 3: activateSoulBurst (Initiates Activation Sequence) ---
function activateSoulBurst(cardIdToActivate) {
    const userIndex = activatingPlayerIndex; // Use the stored index
    if (userIndex < 0) { console.error("SB Activation Error: Activating player index is invalid."); return; }
    if (!cardIdToActivate) { console.error("SB Activation Error: Specific Card ID was not provided."); activatingPlayerIndex = -1; return; }

    const player = state.players[userIndex];
    if (!player || !Array.isArray(player.inventory)) { console.error("SB Activation Error: Player/inventory missing.", userIndex); activatingPlayerIndex = -1; return; }

    const soulBurstCardObject = player.inventory.find(card => card.id === cardIdToActivate);
    if (!soulBurstCardObject) {
        console.error(`SB Activation Error: Could not find SB card with ID ${cardIdToActivate}.`);
        showInfoModal("Activation Failed", "Cannot find the specific Soul Burst card.");
        activatingPlayerIndex = -1; return;
    }

    const currentCharge = soulBurstCardObject.charge || 0;
    const stealPotential = Math.floor(currentCharge * 0.5);

    if (stealPotential <= 0) { showInfoModal("Soul Burst Fizzles", "No power stored!"); activatingPlayerIndex = -1; return; }
    if (state.players.length < 2) { showInfoModal("Lonely Soul", "No target available."); activatingPlayerIndex = -1; return; }

    console.log(`[Soul Burst] Activating Card ID: ${cardIdToActivate}. Charge: ${currentCharge}, Steal: ${stealPotential}. Selecting victim...`);
    prepareAndShowPlayerSelectModal(
        (victimIndex) => handleSoulBurstVictimSelection(victimIndex, cardIdToActivate),
        `Choose Soul to Drain (${stealPotential} points)`
    );
    // activatingPlayerIndex remains set for the callback
}


// --- FUNCTION 4: handleSoulBurstVictimSelection (Callback after Victim is Chosen) ---
function handleSoulBurstVictimSelection(victimIndex, cardIdToRemove) {
    const userIndex = activatingPlayerIndex; // Retrieve stored index

    // Reset context now that we have the needed info
    activatingPlayerIndex = -1;
    activatingSoulBurstCardId = null;

    // Validate data
    if (userIndex < 0 || victimIndex < 0 || userIndex === victimIndex || !cardIdToRemove) {
        console.error("SB Victim Selection Error: Invalid indices/ID.", { userIndex, victimIndex, cardIdToRemove });
        return;
    }
    const victimPlayer = state.players[victimIndex];
    const userPlayer = state.players[userIndex];
    if (!victimPlayer || !userPlayer || !Array.isArray(userPlayer.inventory)) {
        console.error("SB Victim Selection Error: Player objects/inventory invalid.", { userIndex, victimIndex });
        return;
    }

    // *** ADD COALITION CHECK ***
    if (state.isInCoalitionWith(userIndex, victimIndex)) {
        showInfoModal("Coalition Pact!", `Soul Burst cannot drain your coalition partner, ${victimPlayer.name}!`);
        // Card is NOT consumed because we return before removing it.
        return; // Stop the effect
    }
    // *** END CHECK ***

    // --- Original Effect Logic ---
    // Find the specific card again (final check)
    const soulBurstCardObject = userPlayer.inventory.find(card => card.id === cardIdToRemove);
    if (!soulBurstCardObject) {
        console.error(`SB Victim Selection Error: Could not re-find SB card ID ${cardIdToRemove}.`);
        showInfoModal("Activation Error", "Soul Burst card vanished!");
        return;
    }

    const currentCharge = soulBurstCardObject.charge || 0;
    const amountToSteal = Math.floor(currentCharge * 0.5);
    if (amountToSteal <= 0) {
        console.warn("SB Victim Selection Error: Steal amount <= 0.");
        // Consume the card even if charge is 0? Arguably yes, activation was attempted.
        const cardRemovedZeroCharge = state.removeCardFromPlayerInventory(userIndex, cardIdToRemove); // Use ID!
        if (cardRemovedZeroCharge) updatePlayerInventoryDisplay(userIndex);
        showInfoModal("Soul Burst Fizzles", "Not enough charge to steal anything!");
        return;
    }

    // Execute effect
    console.log(`[Soul Burst] Victim: ${victimIndex}. Stealing: ${amountToSteal}. Removing Card ID: ${cardIdToRemove}`);
    modifyPlayerScore(victimIndex, -amountToSteal); // Victim loses
    modifyPlayerScore(userIndex, amountToSteal);   // User gains

    // Consume the specific card
    const cardRemoved = state.removeCardFromPlayerInventory(userIndex, cardIdToRemove); // Use ID!
    if (cardRemoved) {
        updatePlayerInventoryDisplay(userIndex);
    } else {
        console.error(`[Soul Burst] CRITICAL ERROR: Failed to remove SB ID ${cardIdToRemove} after successful steal.`);
        showInfoModal("Activation Error", "Failed to consume Soul Burst card after use. Notify GM.");
    }

    // Notify
    showInfoModal("Soul Burst!", `${userPlayer.name} unleashes stored suffering upon ${victimPlayer.name}, stealing ${amountToSteal} points!`);
}



// --- Other Activation Functions (Keep Your Full Implementations Here) ---

function activateCardGobbler() {
    const userIndex = activatingPlayerIndex; // Use stored index
    if (userIndex < 0) { console.error("Gobbler Error: Activating player index is invalid."); return; } // Check context
    if (state.players.length < 2) { showInfoModal("Lonely Gobbler", "Needs a victim!"); activatingPlayerIndex = -1; return; } // Reset context on error
    const potentialVictims = state.players.filter((p, i) => i !== userIndex && p.inventory?.length > 0);
    if (potentialVictims.length === 0) { showInfoModal("Empty Pockets", "No cards to gobble!"); activatingPlayerIndex = -1; return; } // Reset context on error

    // Proceed to victim selection
    console.log("[Card Gobbler] Step 1: Selecting Victim...");
    prepareAndShowPlayerSelectModal(handleCardGobblerVictimSelection, "Choose Victim for Gobbler");
    // Context (activatingPlayerIndex) remains set for the callback
}

function handleCardGobblerVictimSelection(victimIndex) {
    const userIndex = activatingPlayerIndex; // Retrieve stored index
    activatingPlayerIndex = -1; // Reset context

    // Basic validation
    if (userIndex < 0 || victimIndex < 0 || victimIndex === userIndex || victimIndex >= state.players.length) {
        console.error("Gobbler Victim Error: Invalid index.", { userIndex, victimIndex });
        return;
    }

    const victimPlayer = state.players[victimIndex];
    const userPlayer = state.players[userIndex];

    if (!userPlayer || !victimPlayer) {
        console.error("Gobbler Victim Error: Player object not found.", { userIndex, victimIndex });
        return;
    }

    // *** ADD COALITION CHECK ***
    if (state.isInCoalitionWith(userIndex, victimIndex)) {
        showInfoModal("Coalition Pact!", `The Card Gobbler refuses to eat cards from your coalition partner, ${victimPlayer.name}!`);
        // Card is NOT consumed because we return before removing it.
        return; // Stop the effect
    }
    // *** END CHECK ***

    // --- Original Check for Empty Inventory ---
    if (!victimPlayer.inventory || victimPlayer.inventory.length === 0) {
        showInfoModal("Empty Pockets!", `${victimPlayer.name} has no cards for the Gobbler to eat!`);
        // Consume the user's card even if the victim has nothing, as the action was attempted.
        const removedFromUser = state.removeCardFromPlayerInventory(userIndex, 'card_gobbler.png');
        if (removedFromUser) updatePlayerInventoryDisplay(userIndex);
        return;
    }

    // --- Original Effect Logic ---
    const victimInventory = victimPlayer.inventory;
    const randomIndex = Math.floor(Math.random() * victimInventory.length);
    const cardToRemoveObject = victimInventory[randomIndex]; // Get the specific card object
    const cardToRemoveFilename = cardToRemoveObject.filename;
    const cardToRemoveBaseData = getCardDataByFilename(cardToRemoveFilename);
    const wasShiny = cardToRemoveObject.isShiny;

    // Build HTML for display *before* removing
    let eatenCardHTML = '<p>(Error displaying eaten card)</p>';
    if (cardToRemoveBaseData) {
        const cardEl = buildCardElement(cardToRemoveBaseData, { isShiny: wasShiny });
        if (cardEl) eatenCardHTML = cardEl.outerHTML;
    }

    // Remove the specific card *object* from the victim (more robust if duplicates exist)
    // We need a state function that removes by object reference or unique ID if available.
    // For now, assume removeCardFromPlayerInventory removes the first filename match which is usually sufficient.
    const removedFromVictim = state.removeCardFromPlayerInventory(victimIndex, cardToRemoveFilename);

    // Remove gobbler from user *after* successful removal from victim
    let removedFromUser = false;
    if (removedFromVictim) {
        removedFromUser = state.removeCardFromPlayerInventory(userIndex, 'card_gobbler.png');
    } else {
        console.error("[Card Gobbler] Failed to remove card from victim's inventory. Not consuming user's card.");
        // Maybe show an error?
        showInfoModal("Gobbler Hiccup!", `Failed to remove the card from ${victimPlayer.name}. Your Gobbler card was not used.`);
        return; // Stop if victim removal failed
    }

    // Update displays if cards were removed
    if (removedFromVictim) updatePlayerInventoryDisplay(victimIndex);
    if (removedFromUser) updatePlayerInventoryDisplay(userIndex);

    // Show result
    const victimName = victimPlayer.name || 'the victim';
    const userName = userPlayer.name || 'Someone';
    const messageText = `${userName}'s Card Gobbler lunges! ${victimName} loses:`;
    const finalMessageHTML = `<p style="margin-bottom: 15px;">${messageText}</p><div class="info-modal-eaten-card">${eatenCardHTML}</div>`;
    showInfoModal("Gobbled!", finalMessageHTML);
}

function activatePuppetMaster() {
    const userIndex = activatingPlayerIndex; // Use stored index
    if (userIndex < 0) { console.error("Puppet Error: Activating player index is invalid."); return; } // Check context
    if (state.players.length < 2) { showInfoModal("No Targets", "Needs a puppet!"); activatingPlayerIndex = -1; return; } // Reset context on error

    // Proceed to victim selection
    console.log("[PuppetMaster] Step 1: Selecting Victim...");
    prepareAndShowPlayerSelectModal(handlePuppetVictimSelection, "Choose a Puppet");
    // Context (activatingPlayerIndex) remains set for the callback
}

function handlePuppetVictimSelection(victimIndex) {
    const userIndex = activatingPlayerIndex; // Use stored index (don't reset yet)

    // Basic validation
    if (userIndex < 0 || victimIndex < 0 || victimIndex === userIndex) {
        showInfoModal("Invalid Target", "Cannot target self or invalid player for Puppet Master.");
        activatingPlayerIndex = -1; // Reset context on error
        return;
    }

    const victimPlayer = state.players[victimIndex];
    if (!victimPlayer) {
         showInfoModal("Invalid Target", "Target player not found.");
         activatingPlayerIndex = -1; // Reset context on error
         return;
    }

    // *** ADD COALITION CHECK ***
    if (state.isInCoalitionWith(userIndex, victimIndex)) {
        showInfoModal("Coalition Pact!", `You cannot use Puppet Master on your coalition partner, ${victimPlayer.name}!`);
        activatingPlayerIndex = -1; // Reset context
        // Card is NOT consumed because we return before the next step where it would be.
        return; // Stop the effect
    }
    // *** END CHECK ***

    // --- Original Logic ---
    console.log(`[PuppetMaster] Victim: ${victimIndex}. Selecting Category...`);
    // Pass userIndex (as activatingIndex) and victimIndex
    // Context (activatingPlayerIndex) remains set for the next callback (handlePuppetCategorySelection)
    showCategorySelectModal(userIndex, victimIndex, handlePuppetCategorySelection);
}

function handlePuppetCategorySelection(activatingIndex, victimIndex, categoryIndex) {
    // activatingPlayerIndex is passed as activatingIndex, reset it now
    activatingPlayerIndex = -1;
    console.log(`[PuppetMaster] Category Selected: ${categoryIndex}. Finalizing for victim ${victimIndex} by user ${activatingIndex}`);
    state.setPlayerForcedCategory(victimIndex, categoryIndex);
    const cardRemoved = state.removeCardFromPlayerInventory(activatingIndex, 'puppet_master.png');
    if (cardRemoved) updatePlayerInventoryDisplay(activatingIndex);
    else console.error("Puppet Master Error: Failed to remove card.");
    const categoryName = state.selectedQuizData.categories[categoryIndex]?.name || 'the chosen category';
const activatorName = state.players[activatingIndex]?.name || 'The Puppet Master';
showInfoModal("Strings Attached!", `${activatorName} pulls the strings! ${victimName} must choose from "${categoryName}" next turn.`);
}

// --- Direct Activation Stubs/Implementations ---
function activatePiggyBank(playerIndex) {
    console.log('Activating Piggy Bank for', playerIndex);
    const piggyAmount = 150;
    modifyPlayerScore(playerIndex, piggyAmount);
    const removed = state.removeCardFromPlayerInventory(playerIndex, 'piggy_bank.png');
    if (removed) updatePlayerInventoryDisplay(playerIndex);
    showInfoModal("Oink!", `${state.players[playerIndex]?.name || 'Player'} broke the Piggy Bank for ${piggyAmount} points!`);
}

function activateLootGoblin(pIndex) {
    console.log('Activating Loot Goblin for', pIndex);
    activatingPlayerIndex = pIndex; // Set context for victim selection
    if (state.players.length < 2) { showInfoModal("Lonely Goblin", "No one to steal from!"); activatingPlayerIndex = -1; return; }
    prepareAndShowPlayerSelectModal(handleLootGoblinVictimSelection, "Choose Victim to Rob");
}

function handleLootGoblinVictimSelection(victimIndex) {
    const userIndex = activatingPlayerIndex; // Retrieve context
    activatingPlayerIndex = -1; // Reset context immediately

    // Basic validation
    if (userIndex < 0 || victimIndex < 0 || userIndex === victimIndex) {
        console.error("Loot Goblin Error: Invalid indices", { userIndex, victimIndex });
        // Optional: Show an error modal if desired, though this case should be rare
        return;
    }

    const userPlayer = state.players[userIndex];
    const victimPlayer = state.players[victimIndex];

    if (!userPlayer || !victimPlayer) {
        console.error("Loot Goblin Error: Player object not found", { userIndex, victimIndex });
        return;
    }

    // *** ADD COALITION CHECK ***
    if (state.isInCoalitionWith(userIndex, victimIndex)) {
        showInfoModal("Coalition Pact!", `You cannot steal from your coalition partner, ${victimPlayer.name}!`);
        // Card consumption is prevented because we return before removing it.
        // If the card was consumed earlier, we'd need to refund or change the logic flow.
        // Currently, activation flow doesn't consume until success.
        return; // Stop the effect
    }
    // *** END CHECK ***

    // --- Original effect logic ---
    const stealAmount = 200;
    const victimName = victimPlayer.name || 'Victim';
    const userName = userPlayer.name || 'User';

    console.log(`Loot Goblin: ${userName} steals ${stealAmount} from ${victimName}`);
    modifyPlayerScore(victimIndex, -stealAmount);
    modifyPlayerScore(userIndex, stealAmount);

    // Consume the card *after* successful effect application
    const removed = state.removeCardFromPlayerInventory(userIndex, 'loot_goblin.png');
    if (removed) {
        updatePlayerInventoryDisplay(userIndex);
    } else {
        console.error("[Loot Goblin] CRITICAL ERROR: Failed to remove loot_goblin.png card after successful steal.");
        // State might be inconsistent, but the effect happened.
    }

    showInfoModal("Yoink!", `${userName} uses Loot Goblin to steal ${stealAmount} from ${victimName}!`);
}


function activateSpinyShell(userIndex) {
    console.log('Activating Spiny Shell for', userIndex);
     if (!state.players || state.players.length < 1) return;
    const userPlayer = state.players[userIndex];
    if (!userPlayer) return;

    let leaderIndex = -1;
    let maxScore = -Infinity;
    state.players.forEach((p, i) => { if (p.score > maxScore) { maxScore = p.score; leaderIndex = i; } });

    if (leaderIndex === -1 || maxScore <= 0) { showInfoModal("No Effect!", "No clear leader or leader has no points!"); return; }

    const leaderPlayer = state.players[leaderIndex];
    const pointsToTake = Math.floor(leaderPlayer.score * 0.20);
    if (pointsToTake <= 0) { showInfoModal("No Effect!", `${leaderPlayer.name} doesn't have enough points!`); return; }

    const targetName = (leaderIndex === userIndex) ? "themselves" : leaderPlayer.name;
    console.log(`Spiny Shell: ${userPlayer.name} hits ${targetName}, losing ${pointsToTake} points.`);
    modifyPlayerScore(leaderIndex, -pointsToTake);
    const removed = state.removeCardFromPlayerInventory(userIndex, 'spiny_shell.png');
    if (removed) updatePlayerInventoryDisplay(userIndex);
    const msgPart = (leaderIndex === userIndex) ? "" : ` ${userPlayer.name} watches gleefully!`;
    showInfoModal("Shell Shock!", `${userPlayer.name} hit ${targetName} with a Spiny Shell! They lose ${pointsToTake} points!${msgPart}`);
}

function activateRoulette(playerIndex) {
    console.log('Activating Roulette for', playerIndex);
    // Need to ensure rouletteModal consumes the card after use
    showRouletteModal(playerIndex);
}

// --- Modal Closing and Listeners ---
export function closeInventoryModal() {
    if (inventoryModal) {
        inventoryModal.style.display = 'none';
    }
     console.log("Inventory modal closed."); // Add log for clarity
}

export function setupInventoryModalListeners() {
    if (!inventoryModal) return; // Don't setup if modal doesn't exist

    if (inventoryCloseBtn) {
        inventoryCloseBtn.addEventListener('click', closeInventoryModal);
    } else console.warn("Listener not added: Inventory Modal Close Btn missing.");

    // Close on background click
    inventoryModal.addEventListener('click', (event) => {
        if (event.target === inventoryModal) closeInventoryModal();
    });

    // Prevent clicks inside the content area from closing the modal
    if (inventoryModalContent) {
        inventoryModalContent.addEventListener('click', (e) => e.stopPropagation());
    } else console.warn("Listener not added: Inventory Modal Content missing.");

    // NOTE: Click listeners for individual cards are added dynamically in showInventoryModal
}