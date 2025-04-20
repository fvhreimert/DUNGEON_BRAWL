// js/utils.js
import * as DOM from './domElements.js';
import * as config from './config.js';
// --- Import state functions needed for removal ---
import * as state from './state.js';
import { updatePlayerInventoryDisplay } from './player.js';
import { showInventoryModal } from './modals/inventoryModal.js'; // Needed to refresh modal
import { showConfirmationModal } from './modals/confirmModal.js';
import { showInfoModal } from './modals/infoModal.js';

export function showError(message, target = DOM.setupError) {
    if (!target) {
        console.error("Cannot show error: Target element missing.", message);
        return;
    }
    target.textContent = message;
    target.style.display = 'block';
}

// --- NEW: Card Builder Function ---
export function buildCardElement(cardObject, options = {}) {
    // options: isInventoryItem, count, playerIndex, showRemoveButton, isShiny, cardId
    const errorDiv = document.createElement('div');
    errorDiv.textContent = 'Error loading card';
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '10px';
    errorDiv.style.border = '1px solid red';

    if (!cardObject || !cardObject.filename) { // Check filename exists
        console.error("buildCardElement: Invalid cardObject or missing filename.", cardObject);
        return errorDiv;
    }

    // Base wrapper - assumes CSS targets .card appropriately
    const cardWrapper = document.createElement('div');
    // Add rarity class for theme, and shiny class if needed
    cardWrapper.classList.add('card', cardObject.rarity);
    if (options.isShiny) {
        cardWrapper.classList.add('shiny');
    }

    // Add inventory-specific class and data attributes if it's for the inventory
    if (options.isInventoryItem) {
        cardWrapper.classList.add('inventory-modal-card-item');
        cardWrapper.dataset.filename = cardObject.filename;
        cardWrapper.dataset.playerIndex = options.playerIndex ?? -1;
        cardWrapper.dataset.isShiny = options.isShiny ?? false;
        if (options.cardId) { // Add cardId if provided (for Soul Burst)
             cardWrapper.dataset.cardId = options.cardId;
        }

        // Set descriptive title attribute (for tooltips, accessibility)
        const shinyTitlePart = options.isShiny ? " (Shiny)" : "";
        const countTitlePart = options.count > 1 ? ` (x${options.count})` : "";
        const baseTitle = `${cardObject.title}${shinyTitlePart}${countTitlePart}`;
        if (config.activeCards.has(cardObject.filename)) {
            cardWrapper.classList.add('active-card'); // Make it look clickable via CSS
            cardWrapper.title = `${baseTitle} (Click to Use)`;
        } else {
            cardWrapper.title = `${baseTitle} (Passive)`;
        }
    }

    // --- Add Remove Button Conditionally ---
    if (options.showRemoveButton && options.isInventoryItem) {
        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-card-button');
        removeButton.textContent = 'X';
        const shinyRemoveTitlePart = options.isShiny ? " (Shiny)" : "";
        removeButton.title = `Remove one ${cardObject.title}${shinyRemoveTitlePart}`;
        removeButton.dataset.filename = cardObject.filename;
        removeButton.dataset.playerIndex = options.playerIndex ?? -1;
        removeButton.dataset.cardTitle = cardObject.title;
        removeButton.dataset.isShiny = options.isShiny ?? false;
         if (options.cardId) removeButton.dataset.cardId = options.cardId;

        removeButton.addEventListener('click', handleRemoveCardClick);
        cardWrapper.appendChild(removeButton);
    }

    // --- Build Inner Structure (Image Area + Content Area) ---
    // Image Area
    const imageArea = document.createElement('div');
    imageArea.classList.add('card-image-area');
    const img = document.createElement('img');
    img.src = config.cardsFolderPath + cardObject.filename;
    img.alt = cardObject.title; // Alt text is important
    // Let CSS handle width/height/object-fit
    imageArea.appendChild(img);

    // Content Area
    const contentArea = document.createElement('div');
    contentArea.classList.add('card-content');
    const title = document.createElement('h3');
    title.classList.add('card-title');
    title.textContent = options.isShiny ? `✨ ${cardObject.title} ✨` : cardObject.title;
    const description = document.createElement('p');
    description.classList.add('card-description');
    description.textContent = cardObject.description; // Use description from passed cardObject
    const typeBanner = document.createElement('div');
    typeBanner.classList.add('card-type-banner');
    const typeText = document.createElement('span');
    typeText.classList.add('card-type');
    typeText.textContent = cardObject.type;
    typeBanner.appendChild(typeText);
    contentArea.appendChild(title);
    contentArea.appendChild(description);
    contentArea.appendChild(typeBanner);

    // Append main areas to wrapper
    cardWrapper.appendChild(imageArea);
    cardWrapper.appendChild(contentArea);

    // --- Add count indicator (Top Left) ---
    if (options.isInventoryItem && options.count > 1) {
        const countSpan = document.createElement('span');
        countSpan.classList.add('inventory-card-count'); // Uses existing styles
        countSpan.textContent = `x${options.count}`;
        cardWrapper.appendChild(countSpan); // Append to the main wrapper
    }

    return cardWrapper;
}

// --- Keep getCardDataByFilename ---
const cardDataMap = new Map(config.cardsData.map(card => [card.filename, card]));
export function getCardDataByFilename(filename) {
    return cardDataMap.get(filename);
}

// --- handleRemoveCardClick function (Keep as is from previous version) ---
function handleRemoveCardClick(event) {
    event.stopPropagation();

    const button = event.currentTarget;
    const filename = button.dataset.filename;
    const playerIndex = parseInt(button.dataset.playerIndex);
    const cardTitle = button.dataset.cardTitle || 'this card';
    const isShiny = button.dataset.isShiny === 'true';
    const shinyText = isShiny ? " (Shiny)" : "";
    const cardId = button.dataset.cardId; // Get ID if present

    if (filename && !isNaN(playerIndex) && playerIndex >= 0) {
        const confirmationTitle = "Remove Card?";
        const confirmationMessage = `GM Action:\nAre you sure you want to remove one "${cardTitle}${shinyText}" from Player ${playerIndex + 1}'s inventory?\n(Removes the first available instance).`;

        console.log(`[Remove Click] Showing confirmation for: ${filename}, Player ${playerIndex}, Shiny: ${isShiny}, ID: ${cardId || 'N/A'}`);

        showConfirmationModal(
            confirmationTitle,
            confirmationMessage,
            // onConfirm
            () => {
                console.log(`[Confirm Yes] Executing removal for: ${filename}, Player ${playerIndex}`);
                // Prefer removal by ID if available (for Soul Burst)
                const identifierToRemove = cardId || filename;
                const removed = state.removeCardFromPlayerInventory(playerIndex, identifierToRemove);

                if (removed) {
                    console.log(`[Confirm Yes] Successfully removed from state.`);
                    try {
                        updatePlayerInventoryDisplay(playerIndex);
                        showInventoryModal(playerIndex); // Refresh modal view
                    } catch (updateError) {
                        console.error("[Confirm Yes] Error updating displays after removal:", updateError);
                    }
                } else {
                    console.warn(`[Confirm Yes] Could not remove ${identifierToRemove} from state (maybe not found?).`);
                    showInfoModal("Removal Error", `Could not find "${cardTitle}" in Player ${playerIndex + 1}'s inventory.`);
                    try { showInventoryModal(playerIndex); } // Refresh anyway
                    catch (refreshError) { console.error("[Confirm Yes - Failed Removal] Error refreshing inventory modal:", refreshError); }
                }
            },
            // onCancel
            () => {
                console.log(`[Confirm No] GM cancelled removal of ${filename}${shinyText} for player ${playerIndex}`);
            }
        );
    } else {
        console.error("[Remove Click] Remove card button missing data:", { filename, playerIndex });
    }
}
