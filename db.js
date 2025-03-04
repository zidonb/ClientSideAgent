// db.js - Database structure for AI Food Ordering Assistant

// Database configuration
const DB_NAME = "AIFoodOrderingDB";
const DB_VERSION = 1;
let db; // Global database reference

// Open (or create) IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db); // Return existing connection if available
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Create database structure if it doesn't exist
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log("Creating database structure...");

            // Orders store - for saving order history
            if (!db.objectStoreNames.contains("orders")) {
                const orderStore = db.createObjectStore("orders", { 
                    keyPath: "id", 
                    autoIncrement: true 
                });
                orderStore.createIndex("timestamp", "timestamp", { unique: false });
            }

            // AI Models store - for saving Brain.js and rl-js models
            if (!db.objectStoreNames.contains("aiModels")) {
                db.createObjectStore("aiModels", { keyPath: "name" });
            }

            // Configuration store - for system settings
            if (!db.objectStoreNames.contains("config")) {
                db.createObjectStore("config", { keyPath: "name" });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            initializeConfig().then(() => resolve(db));
        };

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Initialize default configuration if needed
async function initializeConfig() {
    try {
        const transaction = db.transaction("config", "readwrite");
        const store = transaction.objectStore("config");
        
        // Check if config exists
        const request = store.get("systemConfig");
        
        request.onsuccess = (event) => {
            if (!request.result) {
                // Create default configuration
                store.put({
                    name: "systemConfig",
                    trainingFrequency: 10, // Retrain after every 10 orders
                    totalOrderCount: 0,    // New field to track total orders
                    lastTrainingTimestamp: null
                });
                console.log("Default configuration created");
            }
        };
    } catch (error) {
        console.error("Error initializing config:", error);
    }
}

// Save an order and update counters
async function saveOrder(orderData) {
    try {
        const db = await openDatabase();
        
        // Transaction for saving order
        const orderTransaction = db.transaction("orders", "readwrite");
        const orderStore = orderTransaction.objectStore("orders");
        
        // Add timestamp if not provided
        if (!orderData.timestamp) {
            orderData.timestamp = new Date().toISOString();
        }
        
        // Save the order
        const orderRequest = orderStore.add(orderData);
        
        return new Promise((resolve, reject) => {
            orderTransaction.oncomplete = async () => {
                console.log("Order saved successfully");
                // Check if retraining is needed after incrementing the counter
                const shouldRetrain = await incrementOrderCounter();
                resolve(shouldRetrain);
            };
            orderTransaction.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error("Error saving order:", error);
        throw error;
    }
}

// Increment order counter and check if retraining is needed using modulo
async function incrementOrderCounter() {
    try {
        const transaction = db.transaction("config", "readwrite");
        const store = transaction.objectStore("config");
        
        const request = store.get("systemConfig");
        
        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const config = request.result;
                // Increment the total order count
                config.totalOrderCount = (config.totalOrderCount || 0) + 1;
                
                // Save updated configuration
                store.put(config);
                
                // Check if retraining is needed using modulo
                // We use the condition (count % freq === 0) AND (count > 0)
                const shouldRetrain = config.totalOrderCount > 0 && 
                                     (config.totalOrderCount % config.trainingFrequency === 0);
                
                if (shouldRetrain) {
                    console.log(`Retraining threshold reached at order #${config.totalOrderCount}!`);
                    // Update last training timestamp
                    config.lastTrainingTimestamp = new Date().toISOString();
                    store.put(config);
                }
                
                resolve(shouldRetrain);
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error("Error updating order counter:", error);
        throw error;
    }
}

// Save AI model (Brain.js or rl-js)
async function saveAIModel(name, modelData) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("aiModels", "readwrite");
        const store = transaction.objectStore("aiModels");
        
        const modelEntry = {
            name: name,
            data: modelData,
            timestamp: new Date().toISOString()
        };
        
        store.put(modelEntry);
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error(`Error saving ${name} model:`, error);
        throw error;
    }
}

// Load AI model
async function loadAIModel(name) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("aiModels", "readonly");
        const store = transaction.objectStore("aiModels");
        
        const request = store.get(name);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve(null); // Model not found
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error(`Error loading ${name} model:`, error);
        throw error;
    }
}

// Get all orders for training
async function getAllOrders() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("orders", "readonly");
        const store = transaction.objectStore("orders");
        
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error("Error getting orders:", error);
        throw error;
    }
}

// Get the current total order count
async function getTotalOrderCount() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("config", "readonly");
        const store = transaction.objectStore("config");
        
        const request = store.get("systemConfig");
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.totalOrderCount || 0);
                } else {
                    resolve(0); // Config not found
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error("Error getting total order count:", error);
        return 0;
    }
}

// Export database functions
export {
    openDatabase,
    saveOrder,
    saveAIModel,
    loadAIModel,
    getAllOrders,
    incrementOrderCounter,
    getTotalOrderCount
};