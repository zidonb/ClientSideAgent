// ================================
// IndexedDB Setup and User Order Management
// ================================

const DB_NAME = "FoodOrderingDB";  // Name of the database
const DB_VERSION = 1;  // Database version
let db;  // Global database reference

/**
 * Open (or create) IndexedDB database
 * This function ensures the database is initialized and available for transactions
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create "userOrders" object store if it doesn't exist
            if (!db.objectStoreNames.contains("userOrders")) {
                let store = db.createObjectStore("userOrders", { keyPath: "id", autoIncrement: true });
                store.createIndex("userId", "userId", { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save user order selections to IndexedDB
 * Stores main dish, sauces, side dish, and drink preferences with timestamp
 */
async function saveUserSelection(userId, mainDish, sauces, sideDish, drink) {
    const db = await openDatabase();
    const transaction = db.transaction("userOrders", "readwrite");
    const store = transaction.objectStore("userOrders");

    let orderData = {
        userId,
        timestamp: new Date().toISOString(),
        selections: { mainDish, sauces, sideDish, drink }
    };

    store.add(orderData);
}

/**
 * Retrieve all past orders for a specific user from IndexedDB
 * This data will later be used for AI learning and recommendations
 */
async function getUserHistory(userId) {
    const db = await openDatabase();
    const transaction = db.transaction("userOrders", "readonly");
    const store = transaction.objectStore("userOrders");
    const index = store.index("userId");

    return new Promise((resolve, reject) => {
        let request = index.getAll(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ================================
// UI Event Handlers
// ================================

document.addEventListener("DOMContentLoaded", function () {
    
    // Handle Order Submission (Saves data to IndexedDB)
    document.getElementById("submit-order").addEventListener("click", function () {
        let userId = "user_1";  // Static user ID (Can be updated for multi-user support)
        let mainDish = document.getElementById("food-category").value;
        let sideDish = document.getElementById("side").value;
        let drink = document.getElementById("drink").value;
        let sauces = document.getElementById("selected-sauces").value.split(", ");

        saveUserSelection(userId, mainDish, sauces, sideDish, drink)
            .then(() => {
                console.log("Order saved successfully!");
            })
            .catch((error) => {
                console.error("Error saving order:", error);
            });
    });

    // Handle Order History Retrieval (Fetch past orders)
    document.getElementById("view-history").addEventListener("click", async function () {
        let userId = "user_1"; // Static user ID for now

        let pastOrders = await getUserHistory(userId);
        console.log("Past Orders for User:", pastOrders);
    });

});
