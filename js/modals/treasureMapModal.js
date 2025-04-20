// js/modals/treasureMapModal.js
import * as DOM from '../domElements.js';
import * as state from '../state.js';
import * as config from '../config.js';
import { modifyPlayerScore, updatePlayerInventoryDisplay } from '../player.js';
import { showInfoModal } from './infoModal.js';

let currentTreasurePlayerIndex = -1;
// const placeholderImage = 'images/card_placeholder.png'; // Path to your placeholder - Not strictly needed if resetting src to ""

export function showTreasureMapModal(playerIndex) {
    if (!DOM.treasureMapModal || !DOM.openTreasureBtn || !DOM.treasureSlotShovelImg || !DOM.treasureSlotMapImg || !DOM.treasureSlotCompassImg) {
        console.error("Cannot show Treasure Map modal: Required elements missing.");
        return;
    }

    currentTreasurePlayerIndex = playerIndex;
    const player = state.players[playerIndex];
    if (!player) {
        console.error("Treasure Map: Cannot find player", playerIndex);
        currentTreasurePlayerIndex = -1;
        return;
    }

    const inventory = player.inventory || []; // Get the inventory array (of objects)

    // *** FIX: Use .some() to check for filename property ***
    const hasShovel = inventory.some(cardObj => cardObj.filename === config.treasureCards.shovel);
    const hasMap = inventory.some(cardObj => cardObj.filename === config.treasureCards.map);
    const hasCompass = inventory.some(cardObj => cardObj.filename === config.treasureCards.compass);
    // *** END FIX ***

    console.log(`Treasure Check for Player ${playerIndex}: Shovel=${hasShovel}, Map=${hasMap}, Compass=${hasCompass}`); // Debugging log

    // Update card slot images - set src based on the corrected boolean checks
    DOM.treasureSlotShovelImg.src = hasShovel ? config.cardsFolderPath + config.treasureCards.shovel : "";
    DOM.treasureSlotMapImg.src = hasMap ? config.cardsFolderPath + config.treasureCards.map : "";
    DOM.treasureSlotCompassImg.src = hasCompass ? config.cardsFolderPath + config.treasureCards.compass : "";

    // Add/Remove a class to the image or slot for styling empty ones
    DOM.treasureSlotShovelImg.classList.toggle('slot-empty', !hasShovel);
    DOM.treasureSlotMapImg.classList.toggle('slot-empty', !hasMap);
    DOM.treasureSlotCompassImg.classList.toggle('slot-empty', !hasCompass);

    const canOpen = hasShovel && hasMap && hasCompass;
    DOM.openTreasureBtn.disabled = !canOpen;
    if (DOM.treasureMapStatus) {
        DOM.treasureMapStatus.textContent = canOpen ? "All items found! The treasure awaits!" : "Keep searching for the missing pieces...";
    }

    DOM.treasureMapModal.style.display = 'flex';
}

function handleOpenTreasureClick() {
    if (currentTreasurePlayerIndex < 0) {
        console.error("Treasure Error: No player index stored.");
        closeTreasureMapModal();
        return;
    }
    const playerIndex = currentTreasurePlayerIndex;
    const player = state.players[playerIndex];
    if (!player || !Array.isArray(player.inventory)) { // Check inventory is array too
        console.error("Treasure Error: Player or inventory not found/invalid for index", playerIndex);
        closeTreasureMapModal();
        return;
    }

    // --- Final verification (important!) using .some() ---
    const inventory = player.inventory;
    const finalHasShovel = inventory.some(cardObj => cardObj.filename === config.treasureCards.shovel);
    const finalHasMap = inventory.some(cardObj => cardObj.filename === config.treasureCards.map);
    const finalHasCompass = inventory.some(cardObj => cardObj.filename === config.treasureCards.compass);
    // --- END FIX ---

    if (!(finalHasShovel && finalHasMap && finalHasCompass)) {
        console.error("Treasure Error: Player tried to open treasure without all cards (button should be disabled). State mismatch?");
        showInfoModal("Missing Pieces!", "You don't seem to have all the required items anymore!");
        // Re-show modal with updated (presumably missing) items
        showTreasureMapModal(playerIndex); // Refresh the view
        return;
    }

    console.log(`Player ${playerIndex} (${player.name}) is opening the treasure!`);

    // 1. Award Points
    modifyPlayerScore(playerIndex, config.TREASURE_REWARD);

    // 2. Remove ONE of each card (state.removeCardFromPlayerInventory already handles removing the first instance by filename)
    let removedShovel = state.removeCardFromPlayerInventory(playerIndex, config.treasureCards.shovel);
    let removedMap = state.removeCardFromPlayerInventory(playerIndex, config.treasureCards.map);
    let removedCompass = state.removeCardFromPlayerInventory(playerIndex, config.treasureCards.compass);

    // Log removal status
    console.log(`Card removal status - Shovel: ${removedShovel}, Map: ${removedMap}, Compass: ${removedCompass}`);

    // 3. Update player card inventory visual
    if (removedShovel || removedMap || removedCompass) {
        updatePlayerInventoryDisplay(playerIndex);
    }

    // 4. Close this modal and show confirmation
    closeTreasureMapModal();
    showInfoModal("TREASURE FOUND!", `${player.name} combined the map pieces and unearthed a legendary hoard! +${config.TREASURE_REWARD} points!`);
}


// --- closeTreasureMapModal and setupTreasureMapModalListeners remain the same ---
export function closeTreasureMapModal() {
    if (DOM.treasureMapModal) {
        DOM.treasureMapModal.style.display = 'none';
    }
    currentTreasurePlayerIndex = -1;
    if(DOM.openTreasureBtn) DOM.openTreasureBtn.disabled = true;
    if(DOM.treasureMapStatus) DOM.treasureMapStatus.textContent = '';
    // Reset images to empty src and remove empty class
    if(DOM.treasureSlotShovelImg) {
        DOM.treasureSlotShovelImg.src = "";
        DOM.treasureSlotShovelImg.classList.remove('slot-empty');
    }
    if(DOM.treasureSlotMapImg) {
        DOM.treasureSlotMapImg.src = "";
        DOM.treasureSlotMapImg.classList.remove('slot-empty');
    }
    if(DOM.treasureSlotCompassImg) {
        DOM.treasureSlotCompassImg.src = "";
        DOM.treasureSlotCompassImg.classList.remove('slot-empty');
    }
}

export function setupTreasureMapModalListeners() {
    if (!DOM.treasureMapModal) return;

    if (DOM.treasureMapCloseBtn) {
        DOM.treasureMapCloseBtn.addEventListener('click', closeTreasureMapModal);
    } else console.warn("Listener not added: Treasure Map Close Btn missing.");

    if (DOM.openTreasureBtn) {
        DOM.openTreasureBtn.addEventListener('click', handleOpenTreasureClick);
    } else console.warn("Listener not added: Open Treasure Btn missing.");

    // Background click
    DOM.treasureMapModal.addEventListener('click', (event) => {
        if (event.target === DOM.treasureMapModal) closeTreasureMapModal();
    });
    // Prevent content click from closing
    if(DOM.treasureMapModalContent) {
        DOM.treasureMapModalContent.addEventListener('click', (e) => e.stopPropagation());
    }
}