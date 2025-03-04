document.addEventListener("DOMContentLoaded", async function () {
    // Get UI elements
    const mainDishSelect = document.getElementById("food-category");
    const sideDishSelect = document.getElementById("side");
    const drinkSelect = document.getElementById("drink");
    const sauce1Select = document.getElementById("sauce1");
    const sauce2Select = document.getElementById("sauce2");

    const confirmSideCheckbox = document.getElementById("confirm-side");
    const confirmDrinkCheckbox = document.getElementById("confirm-drink");
    const confirmSaucesCheckbox = document.getElementById("confirm-sauces");

    // Initialize Brain.js Neural Network
    const net = new brain.NeuralNetwork();

    // Define the mappings
    const recommendations = {
        'burger': {
            side: 'fries',
            drink: 'cola',
            sauce1: 'ketchup',
            sauce2: 'mayo'
        },
        'hotdog': {
            side: 'fries',
            drink: 'cola',
            sauce1: 'mustard',
            sauce2: 'ketchup'
        },
        'salad': {
            side: 'rice',
            drink: 'water',
            sauce1: 'ranch',
            sauce2: 'vinaigrette'
        },
        'pizza': {
            side: 'onion-rings',
            drink: 'lemonade',
            sauce1: 'bbq',
            sauce2: 'ranch'
        },
        'pasta': {
            side: 'sweet-potato',
            drink: 'iced-tea',
            sauce1: 'garlic',
            sauce2: 'bbq'
        }
    };

    // Step 1: Load or Create AI Model
    let savedModel = await loadTrainedModel();
    if (savedModel) {
        net.fromJSON(savedModel);
        console.log("[AI] Loaded trained model from IndexedDB");
    } else {
        console.log("[AI] No saved model found. Training a new one...");

        // Convert recommendations to training data
        const trainingData = Object.entries(recommendations).map(([dish, choices]) => {
            // Create input object with all dishes set to 0
            const input = Object.keys(recommendations).reduce((acc, key) => {
                acc[key] = 0;
                return acc;
            }, {});
            
            // Set the current dish to 1
            input[dish] = 1;

            // Create output object
            const output = {
                'fries': 0, 'rice': 0, 'onion-rings': 0, 'sweet-potato': 0,
                'cola': 0, 'water': 0, 'lemonade': 0, 'iced-tea': 0,
                'ketchup': 0, 'mayo': 0, 'mustard': 0, 'bbq': 0, 'ranch': 0, 
                'garlic': 0, 'vinaigrette': 0
            };

            // Set chosen options to 1
            output[choices.side] = 1;
            output[choices.drink] = 1;
            output[choices.sauce1] = 1;
            output[choices.sauce2] = 1;

            return { input, output };
        });

        net.train(trainingData, {
            iterations: 2000,
            errorThresh: 0.005
        });

        await saveTrainedModel(net);
        console.log("[AI] New model trained and saved");
    }

    // Step 2: Update UI based on AI recommendations
    function updateAIRecommendations() {
        const mainDish = mainDishSelect.value;
        if (!mainDish) {
            console.log("[AI] No main dish selected");
            return;
        }

        console.log("[AI] Main dish selected:", mainDish);

        // Use direct mapping instead of AI for reliable results
        const suggestions = recommendations[mainDish];
        if (!suggestions) {
            console.log("[AI] No recommendations found for", mainDish);
            return;
        }

        console.log("[AI] Suggestions:", suggestions);

        // Update UI if not confirmed
        if (!confirmSideCheckbox.checked && suggestions.side) {
            sideDishSelect.value = suggestions.side;
            console.log("[AI] Updated side to:", suggestions.side);
        }

        if (!confirmDrinkCheckbox.checked && suggestions.drink) {
            drinkSelect.value = suggestions.drink;
            console.log("[AI] Updated drink to:", suggestions.drink);
        }

        if (!confirmSaucesCheckbox.checked) {
            if (suggestions.sauce1) {
                sauce1Select.value = suggestions.sauce1;
                console.log("[AI] Updated sauce1 to:", suggestions.sauce1);
            }
            if (suggestions.sauce2) {
                sauce2Select.value = suggestions.sauce2;
                console.log("[AI] Updated sauce2 to:", suggestions.sauce2);
            }
        }
    }

    // Step 3: Add event listeners
    if (mainDishSelect) {
        mainDishSelect.addEventListener("change", updateAIRecommendations);
    } else {
        console.error("[AI] Could not find main dish select element");
    }
});

// IndexedDB functions remain the same
async function saveTrainedModel(model) {
    const db = await openDatabase();
    const transaction = db.transaction("userPreferences", "readwrite");
    const store = transaction.objectStore("userPreferences");
    const modelData = model.toJSON();
    await store.put({ userId: "global_model", model: modelData });
    console.log("[AI] Trained model saved to IndexedDB");
}

async function loadTrainedModel() {
    const db = await openDatabase();
    const transaction = db.transaction("userPreferences", "readonly");
    const store = transaction.objectStore("userPreferences");

    return new Promise((resolve, reject) => {
        const request = store.get("global_model");
        request.onsuccess = () => {
            if (request.result) {
                console.log("[AI] Loaded trained model from IndexedDB");
                resolve(request.result.model);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}