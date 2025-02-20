// ================================
// IndexedDB Setup and User Order Management
// ================================

const DB_NAME = "FoodOrderingDB";
const DB_VERSION = 2;
let db;  // Global database reference

/**
 * Open (or create) IndexedDB database and handle version upgrades properly.
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db); // Return existing connection if available
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log("[IndexedDB] Upgrading database to version:", DB_VERSION);

            if (!db.objectStoreNames.contains("userOrders")) {
                let store = db.createObjectStore("userOrders", { keyPath: "id", autoIncrement: true });
                store.createIndex("userId", "userId", { unique: false });
            }

            if (!db.objectStoreNames.contains("userPreferences")) {
                let store = db.createObjectStore("userPreferences", { keyPath: "userId" });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("[IndexedDB] Failed to open database:", event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Save user selections when they change.
 */
async function saveUserSelection(userId, selections) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("userOrders", "readwrite");
        const store = transaction.objectStore("userOrders");

        let orderData = {
            userId,
            timestamp: new Date().toISOString(),
            selections
        };

        const request = store.add(orderData);

        request.onsuccess = () => {
        };

        request.onerror = (event) => {
            console.error("[IndexedDB] Error saving selections:", event.target.error);
        };

    } catch (error) {
        console.error("[IndexedDB] saveUserSelection() failed:", error);
    }
}

/**
 * Save user preferences (checkbox confirmations) when they change.
 */
async function saveUserPreferences(userId, confirmations) {
    console.log("[IndexedDB] Saving user preferences...");

    try {
        const db = await openDatabase();
        const transaction = db.transaction("userPreferences", "readwrite");
        const store = transaction.objectStore("userPreferences");

        const request = store.put({ userId, confirmations });

        request.onsuccess = () => {
            console.log("[IndexedDB] Preferences saved successfully:", confirmations);
        };

        request.onerror = (event) => {
            console.error("[IndexedDB] Error saving preferences:", event.target.error);
        };

    } catch (error) {
        console.error("[IndexedDB] saveUserPreferences() failed:", error);
    }
}

/**
 * Save the finalized order when "Place Order" is clicked.
 */
async function saveFinalOrder(userId, selections, confirmations) {
    console.log("[IndexedDB] Saving final order...");

    try {
        const db = await openDatabase();
        const transaction = db.transaction("userOrders", "readwrite");
        const store = transaction.objectStore("userOrders");

        let finalOrder = {
            userId,
            timestamp: new Date().toISOString(),
            selections,
            confirmations
        };

        const request = store.add(finalOrder);

        request.onsuccess = () => {
            console.log("[IndexedDB] Final order saved successfully:", finalOrder);
        };

        request.onerror = (event) => {
            console.error("[IndexedDB] Error saving final order:", event.target.error);
        };

    } catch (error) {
        console.error("[IndexedDB] saveFinalOrder() failed:", error);
    }
}

/**
 * Retrieve all past orders for a specific user from IndexedDB.
 */
async function getUserHistory(userId) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("userOrders", "readonly");
        const store = transaction.objectStore("userOrders");
        const index = store.index("userId");

        return new Promise((resolve, reject) => {
            let request = index.getAll(userId);
            request.onsuccess = () => {
                console.log("[IndexedDB] Retrieved past orders:", request.result);
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error retrieving user history:", event.target.error);
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error("[IndexedDB] getUserHistory() failed:", error);
    }
}

/**
 * Retrieve user preferences (checkbox confirmations) from IndexedDB.
 */
async function getUserPreferences(userId) {
    console.log("[IndexedDB] Fetching user preferences...");

    try {
        const db = await openDatabase();
        const transaction = db.transaction("userPreferences", "readonly");
        const store = transaction.objectStore("userPreferences");

        return new Promise((resolve, reject) => {
            let request = store.get(userId);
            request.onsuccess = () => {
                console.log("[IndexedDB] Retrieved user preferences:", request.result);
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error retrieving preferences:", event.target.error);
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error("[IndexedDB] getUserPreferences() failed:", error);
    }
}

// ================================
// UI Event Handlers (Auto-save Mechanism)
// ================================

document.addEventListener("DOMContentLoaded", function () {
    function getSelections() {
        return {
            mainDish: document.getElementById("food-category")?.value || "none",
            sideDish: document.getElementById("side")?.value || "none",
            drink: document.getElementById("drink")?.value || "none",
            sauces: {
                sauce1: document.getElementById("sauce1")?.value || "none",
                sauce2: document.getElementById("sauce2")?.value || "none"
            },
            deliveryComment: document.getElementById("delivery-comment")?.value || ""
        };
    }

    function getConfirmations() {
        return {
            sideDish: document.getElementById("confirm-side")?.checked || false,
            drink: document.getElementById("confirm-drink")?.checked || false,
            sauces: document.getElementById("confirm-sauces")?.checked || false
        };
    }

    function autoSaveSelection() {
        let userId = "user_1";
        let selections = getSelections();
        saveUserSelection(userId, selections);
    }

    function autoSaveConfirmations() {
        let userId = "user_1";
        let confirmations = getConfirmations();
        saveUserPreferences(userId, confirmations);
    }

    // Attach auto-save event listeners for dropdowns
    document.getElementById("food-category").addEventListener("change", autoSaveSelection);
    document.getElementById("side").addEventListener("change", autoSaveSelection);
    document.getElementById("drink").addEventListener("change", autoSaveSelection);
    document.getElementById("sauce1").addEventListener("change", autoSaveSelection);
    document.getElementById("sauce2").addEventListener("change", autoSaveSelection);
    document.getElementById("delivery-comment").addEventListener("input", autoSaveSelection);

    // Attach auto-save event listeners for checkboxes
    document.getElementById("confirm-side").addEventListener("change", autoSaveConfirmations);
    document.getElementById("confirm-drink").addEventListener("change", autoSaveConfirmations);
    document.getElementById("confirm-sauces").addEventListener("change", autoSaveConfirmations);

    // Submit order button
    document.getElementById("submit-order").addEventListener("click", function () {
        let userId = "user_1";
        let selections = getSelections();
        let confirmations = getConfirmations();
        saveFinalOrder(userId, selections, confirmations);
    });

    // View history button
    document.getElementById("view-history").addEventListener("click", async function () {
        let userId = "user_1";
        let pastOrders = await getUserHistory(userId);
    });
});