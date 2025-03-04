// ai-coordinator.js - Combines Brain.js and RL for recommendations

import foodRecommender from './brain-network.js';
import rlAgent from './rl-agent.js';
import { saveOrder, updateOrderCounter } from './db.js';

// AI Coordinator combines neural network and reinforcement learning
class AICoordinator {
    constructor() {
        this.initialized = false;
        this.lastRecommendation = null;
        this.debugInfo = [];
    }
    
    // Initialize both AI components
    async initialize() {
        console.log("Initializing AI Coordinator...");
        
        // Initialize Brain.js neural network
        await foodRecommender.initialize();
        
        // Initialize RL agent
        await rlAgent.initialize();
        
        this.initialized = true;
        console.log("AI Coordinator initialization complete");
        
        return this.initialized;
    }
    
    // Get recommendations based on selected main dish
    getRecommendations(mainDish) {
        if (!this.initialized) {
            console.error("AI Coordinator not initialized");
            return null;
        }
        
        this.debugInfo = []; // Clear previous debug info
        this.addDebugInfo(`User selected: ${mainDish}`);
        
        // Get initial prediction from Brain.js
        const brainPrediction = foodRecommender.predict(mainDish);
        this.addDebugInfo(`Brain.js suggests - Side: ${brainPrediction.recommendation.side}, Drink: ${brainPrediction.recommendation.drink}, Sauce: ${brainPrediction.recommendation.sauce}`);
        
        // Apply RL adjustments
        const finalRecommendation = rlAgent.adjust(mainDish, brainPrediction);
        this.addDebugInfo(`After RL adjustments - Side: ${finalRecommendation.recommendation.side}, Drink: ${finalRecommendation.recommendation.drink}, Sauce: ${finalRecommendation.recommendation.sauce}`);
        
        // Save last recommendation for learning
        this.lastRecommendation = {
            mainDish,
            recommendation: finalRecommendation.recommendation
        };
        
        return finalRecommendation;
    }
    
    // Process user's order and learn from it
    async processOrder(order) {
        if (!this.initialized || !this.lastRecommendation) {
            console.error("Cannot process order: AI not initialized or no recommendation made");
            return false;
        }
        
        this.addDebugInfo(`Order placed - Side: ${order.side}, Drink: ${order.drink}, Sauce: ${order.sauce}`);
        
        // Learn from user's choices
        await rlAgent.learn(
            this.lastRecommendation.mainDish,
            this.lastRecommendation.recommendation,
            {
                side: order.side,
                drink: order.drink,
                sauce: order.sauce
            }
        );
        
        // Save order to database
        await saveOrder({
            mainDish: this.lastRecommendation.mainDish,
            side: order.side,
            drink: order.drink,
            sauce: order.sauce,
            timestamp: new Date().toISOString(),
            recommendedItems: this.lastRecommendation.recommendation
        });
        
        // Update order counter and check if retraining is needed
        const shouldRetrain = await updateOrderCounter();
        
        // If retraining threshold reached, retrain neural network
        if (shouldRetrain) {
            this.addDebugInfo("Retraining threshold reached, updating Brain.js model");
            await foodRecommender.trainWithOrderHistory();
        }
        
        return true;
    }
    
    // Add debug information
    addDebugInfo(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.debugInfo.push(`[${timestamp}] ${message}`);
        console.log(message);
    }
    
    // Get debug information
    getDebugInfo() {
        return this.debugInfo;
    }
}

// Create and export singleton instance
const aiCoordinator = new AICoordinator();
export default aiCoordinator;