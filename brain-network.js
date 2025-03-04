// brain-network.js - Neural network implementation using Brain.js

// brain-network.js - Neural network implementation using Brain.js

const net = new brain.NeuralNetwork({
    hiddenLayers: [4],
    activation: 'sigmoid'
});

import { saveAIModel, loadAIModel, getAllOrders } from './db.js';

// Neural network for food recommendations
class FoodRecommender {
    constructor() {
        this.net = new brain.NeuralNetwork({
            hiddenLayers: [4], // Simple network structure
            activation: 'sigmoid'
        });
        this.isInitialized = false;
    }

    // REPLACE THIS ENTIRE METHOD with the updated one
    async initialize() {
        try {
            // First, check if initialization has already occurred
            const initStatus = await loadAIModel('initialization-status');

            if (initStatus && initStatus.completed) {
                console.log("System already initialized, checking for saved model");

                // System initialized, try to load saved model
                const savedModel = await loadAIModel('brainjs-model');

                if (savedModel) {
                    // Load existing model
                    this.net.fromJSON(savedModel);
                    console.log("Loaded existing Brain.js model");
                    this.isInitialized = true;
                } else {
                    // This is an unusual state - initialized but no model
                    // Re-run initial training
                    console.log("Initialization flag found but no model, retraining");
                    await this.trainWithDefaultData();
                }
            } else {
                // First time initialization
                console.log("First-time initialization, training with default data");
                await this.trainWithDefaultData();

                // Mark as initialized
                await saveAIModel('initialization-status', { completed: true, timestamp: new Date().toISOString() });
            }

            return this.isInitialized;
        } catch (error) {
            console.error("Error initializing neural network:", error);
            // Fall back to default training
            await this.trainWithDefaultData();

            // Try to mark as initialized even after error
            try {
                await saveAIModel('initialization-status', { completed: true, timestamp: new Date().toISOString() });
            } catch (e) {
                console.error("Could not save initialization status:", e);
            }

            return this.isInitialized;
        }
    }




    // Train with default data for cold start
    async trainWithDefaultData() {
        console.log("Training with default data...");

        // Initial training data with normalized probabilities
        const trainingData = [
            // Burger combinations
            { input: { burger: 1 }, output: { fries: 0.53, onion_rings: 0.27, side_salad: 0.13, rice: 0.07 } }, // Sum = 1
            { input: { burger: 1 }, output: { cola: 0.47, lemonade: 0.33, water: 0.13, iced_tea: 0.07 } }, // Sum = 1
            { input: { burger: 1 }, output: { ketchup: 0.30, mayo: 0.26, bbq: 0.22, mustard: 0.17, none: 0.05 } }, // Sum = 1

            // Pizza combinations
            { input: { pizza: 1 }, output: { side_salad: 0.47, fries: 0.27, onion_rings: 0.20, rice: 0.06 } }, // Sum = 1
            { input: { pizza: 1 }, output: { lemonade: 0.38, cola: 0.31, iced_tea: 0.19, water: 0.12 } }, // Sum = 1
            { input: { pizza: 1 }, output: { none: 0.33, bbq: 0.27, ketchup: 0.20, mayo: 0.13, mustard: 0.07 } }, // Sum = 1

            // Salad combinations
            { input: { salad: 1 }, output: { rice: 0.64, fries: 0.18, side_salad: 0.09, onion_rings: 0.09 } }, // Sum = 1
            { input: { salad: 1 }, output: { water: 0.44, iced_tea: 0.33, lemonade: 0.17, cola: 0.06 } }, // Sum = 1
            { input: { salad: 1 }, output: { none: 0.50, mayo: 0.21, mustard: 0.14, bbq: 0.07, ketchup: 0.07 } }, // Sum = 1

            // Pasta combinations
            { input: { pasta: 1 }, output: { side_salad: 0.54, rice: 0.23, fries: 0.15, onion_rings: 0.08 } }, // Sum = 1
            { input: { pasta: 1 }, output: { iced_tea: 0.38, water: 0.31, lemonade: 0.19, cola: 0.12 } }, // Sum = 1
            { input: { pasta: 1 }, output: { none: 0.46, mayo: 0.23, bbq: 0.15, mustard: 0.08, ketchup: 0.08 } }, // Sum = 1
        ];

        // Train the network
        const result = this.net.train(trainingData, {
            iterations: 2000,
            errorThresh: 0.005,
            log: true,
            logPeriod: 500
        });

        console.log("Initial training complete:", result);

        // Save the trained model
        await saveAIModel('brainjs-model', this.net.toJSON());
        this.isInitialized = true;
    }

    // Train with historical order data
    // Updated version without resetOrderCounter:
    async trainWithOrderHistory() {
        try {
            const orders = await getAllOrders();

            if (orders.length < 5) {
                console.log("Not enough order data for training");
                return false;
            }

            console.log(`Training with ${orders.length} historical orders...`);

            // Convert order history to training data format
            const trainingData = this.prepareTrainingData(orders);

            // Train the network
            const result = this.net.train(trainingData, {
                iterations: 2000,
                errorThresh: 0.005,
                log: true,
                logPeriod: 500
            });

            console.log("Training with order history complete:", result);

            // Save the updated model
            await saveAIModel('brainjs-model', this.net.toJSON());

            // No need to reset counter anymore with the modulo approach

            return true;
        } catch (error) {
            console.error("Error training with order history:", error);
            return false;
        }
    }

    // Convert orders to training data format
    prepareTrainingData(orders) {
        const trainingData = [];

        orders.forEach(order => {
            // Each order becomes a training example
            const input = {};
            input[order.mainDish] = 1;

            const output = {
                // Side dish outputs
                fries: 0,
                onion_rings: 0,
                side_salad: 0,
                rice: 0,

                // Drink outputs
                cola: 0,
                lemonade: 0,
                water: 0,
                iced_tea: 0,

                // Sauce outputs
                ketchup: 0,
                mayo: 0,
                bbq: 0,
                mustard: 0,
                none: 0
            };

            // Set the selected options to higher values
            output[order.side] = 1;
            output[order.drink] = 1;
            output[order.sauce] = 1;

            trainingData.push({ input, output });
        });

        return trainingData;
    }

    // Make prediction based on selected main dish
    predict(mainDish) {
        if (!this.isInitialized) {
            console.error("Neural network not initialized");
            return null;
        }

        // Prepare input
        const input = {};
        input[mainDish] = 1;

        // Get prediction
        const rawOutput = this.net.run(input);
        console.log("Brain.js raw prediction:", rawOutput);

        // Process the raw output into categories
        const sides = this.extractCategory(rawOutput, ['fries', 'onion_rings', 'side_salad', 'rice']);
        const drinks = this.extractCategory(rawOutput, ['cola', 'lemonade', 'water', 'iced_tea']);
        const sauces = this.extractCategory(rawOutput, ['ketchup', 'mayo', 'bbq', 'mustard', 'none']);

        return {
            rawOutput,
            sides,
            drinks,
            sauces,
            // Get highest probability items
            recommendation: {
                side: sides[0].item,
                drink: drinks[0].item,
                sauce: sauces[0].item
            }
        };
    }

    // Extract and sort category items by probability
    extractCategory(output, categoryItems) {
        return categoryItems
            .map(item => ({
                item,
                probability: output[item] || 0
            }))
            .sort((a, b) => b.probability - a.probability);
    }
}

// Create and export singleton instance
const foodRecommender = new FoodRecommender();
export default foodRecommender;