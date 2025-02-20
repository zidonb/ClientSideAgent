// IndexedDB Setup
const DB_NAME = "FoodOrderingDB";
const DB_VERSION = 1;
let db;

// Open or create IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("userOrders")) {
                let store = db.createObjectStore("userOrders", { keyPath: "id", autoIncrement: true });
                store.createIndex("userId", "userId", { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Function to Save User Selections
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

// Function to Connect to UI Dropdowns
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("submit-order").addEventListener("click", function () {
        let userId = "user_1";  // Replace with real user ID if available
        let mainDish = document.getElementById("food-category").value;
        let sideDish = document.getElementById("side").value;
        let drink = document.getElementById("drink").value;
        let sauces = document.getElementById("selected-sauces").value.split(", ");

        saveUserSelection(userId, mainDish, sauces, sideDish, drink).then(() => {
            console.log("Order saved successfully!");
        }).catch((error) => {
            console.error("Error saving order:", error);
        });
    });
});
