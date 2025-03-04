// ai-coordinator.js - Combines Brain.js and RL for recommendations

import foodRecommender from './brain-network.js';
import rlAgent from './rl-agent.js';
import { saveOrder, incrementOrderCounter } from './db.js';

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
        
        // Enhanced Debug: Show raw prediction scores for all options
        this.addDebugInfo(`Brain.js prediction scores:`);
        this.addDebugInfo(`Side options: ${this.formatPredictionScores(brainPrediction.sides)}`);
        this.addDebugInfo(`Drink options: ${this.formatPredictionScores(brainPrediction.drinks)}`);
        this.addDebugInfo(`Sauce options: ${this.formatPredictionScores(brainPrediction.sauces)}`);
        
        this.addDebugInfo(`Brain.js suggests - Side: ${brainPrediction.recommendation.side}, Drink: ${brainPrediction.recommendation.drink}, Sauce: ${brainPrediction.recommendation.sauce}`);
        
        // Enhanced Debug: Show model confidence
        const confidence = this.calculateConfidence(brainPrediction);
        this.addDebugInfo(`Model confidence - Side: ${confidence.side.toFixed(2)}%, Drink: ${confidence.drink.toFixed(2)}%, Sauce: ${confidence.sauce.toFixed(2)}%`);
        
        // Apply RL adjustments
        const finalRecommendation = rlAgent.adjust(mainDish, brainPrediction);
        
        // Enhanced Debug: Show RL adjustments
        this.addDebugInfo(`RL adjustments applied:`);
        this.addDebugInfo(`Side "${finalRecommendation.recommendation.side}": ${this.getAdjustmentValue(mainDish, 'sides', finalRecommendation.recommendation.side)}`);
        this.addDebugInfo(`Drink "${finalRecommendation.recommendation.drink}": ${this.getAdjustmentValue(mainDish, 'drinks', finalRecommendation.recommendation.drink)}`);
        this.addDebugInfo(`Sauce "${finalRecommendation.recommendation.sauce}": ${this.getAdjustmentValue(mainDish, 'sauces', finalRecommendation.recommendation.sauce)}`);
        
        this.addDebugInfo(`After RL adjustments - Side: ${finalRecommendation.recommendation.side}, Drink: ${finalRecommendation.recommendation.drink}, Sauce: ${finalRecommendation.recommendation.sauce}`);
        
        // Save last recommendation for learning
        this.lastRecommendation = {
            mainDish,
            brainPrediction,  // Save original Brain.js prediction
            recommendation: finalRecommendation.recommendation
        };
        
        return finalRecommendation;
    }
    
    // Format prediction scores for debug output
    formatPredictionScores(items) {
        return items.map(item => `${item.item}: ${(item.probability * 100).toFixed(2)}%`).join(', ');
    }
    
    // Calculate confidence based on the difference between top and second choice
    calculateConfidence(prediction) {
        return {
            side: this.calculateCategoryConfidence(prediction.sides),
            drink: this.calculateCategoryConfidence(prediction.drinks),
            sauce: this.calculateCategoryConfidence(prediction.sauces)
        };
    }
    
    // Calculate confidence for a single category
    calculateCategoryConfidence(items) {
        if (items.length < 2) return 100;
        
        // Confidence is the difference between top choice and second choice
        // multiplied by 100 to get a percentage, then capped at 100%
        const diff = (items[0].probability - items[1].probability) * 100;
        return Math.min(Math.max(diff, 0), 100);
    }
    
    // Get adjustment value for a specific item
    getAdjustmentValue(mainDish, category, item) {
        const adjustment = rlAgent.adjustments[mainDish][category][item] || 0;
        const sign = adjustment >= 0 ? '+' : '';
        return `${sign}${adjustment.toFixed(3)}`;
    }
    
    // Process user's order and learn from it
    async processOrder(order) {
        if (!this.initialized || !this.lastRecommendation) {
            console.error("Cannot process order: AI not initialized or no recommendation made");
            return false;
        }
        
        this.addDebugInfo(`Order placed - Side: ${order.side}, Drink: ${order.drink}, Sauce: ${order.sauce}`);
        
        // Enhanced Debug: Show recommendation accuracy
        const accuracy = this.calculateAccuracy(this.lastRecommendation.recommendation, order);
        this.addDebugInfo(`Recommendation accuracy: ${accuracy.overall.toFixed(2)}% (Side: ${accuracy.side ? '✓' : '✗'}, Drink: ${accuracy.drink ? '✓' : '✗'}, Sauce: ${accuracy.sauce ? '✓' : '✗'})`);
        
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
        
        // Enhanced Debug: Show learning outcome
        this.addDebugInfo("Learning outcome:");
        this.addLearningOutcome('Side', this.lastRecommendation.recommendation.side, order.side);
        this.addLearningOutcome('Drink', this.lastRecommendation.recommendation.drink, order.drink);
        this.addLearningOutcome('Sauce', this.lastRecommendation.recommendation.sauce, order.sauce);
        
        // Save order to database and check if retraining is needed
        // The new saveOrder returns whether we should retrain
        const orderData = {
            mainDish: this.lastRecommendation.mainDish,
            side: order.side,
            drink: order.drink,
            sauce: order.sauce,
            timestamp: new Date().toISOString(),
            recommendedItems: this.lastRecommendation.recommendation,
            accuracy: accuracy.overall
        };
        
        const shouldRetrain = await saveOrder(orderData);
        
        // If retraining threshold reached, retrain neural network
        if (shouldRetrain) {
            this.addDebugInfo("Retraining threshold reached, updating Brain.js model");
            await foodRecommender.trainWithOrderHistory();
        }
        
        return true;
    }
    
    // Calculate accuracy of recommendations
    calculateAccuracy(recommendation, userChoice) {
        const sideMatch = recommendation.side === userChoice.side;
        const drinkMatch = recommendation.drink === userChoice.drink;
        const sauceMatch = recommendation.sauce === userChoice.sauce;
        
        // Calculate overall accuracy (percentage of correct recommendations)
        const overall = ((sideMatch ? 1 : 0) + (drinkMatch ? 1 : 0) + (sauceMatch ? 1 : 0)) / 3 * 100;
        
        return {
            overall,
            side: sideMatch,
            drink: drinkMatch,
            sauce: sauceMatch
        };
    }
    
    // Add learning outcome to debug info
    addLearningOutcome(category, recommended, chosen) {
        if (recommended === chosen) {
            this.addDebugInfo(`  ${category}: Reinforcing "${recommended}" (+0.01)`);
        } else {
            this.addDebugInfo(`  ${category}: Decreasing "${recommended}" (-0.02), Increasing "${chosen}" (+0.03)`);
        }
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