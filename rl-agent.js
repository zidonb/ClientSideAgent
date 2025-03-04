// rl-agent.js - Reinforcement learning implementation using rl-js

import { saveAIModel, loadAIModel } from './db.js';

// Simple reinforcement learning agent for food recommendations
class ReinforcementAgent {
    constructor() {
        // Initialize learning parameters
        this.learningRate = 0.1;  // How quickly the agent learns from new experiences
        this.discountFactor = 0.9;  // How much future rewards matter vs immediate rewards
        
        // Initialize adjustments table for each main dish
        this.adjustments = {
            burger: this.createEmptyAdjustments(),
            pizza: this.createEmptyAdjustments(),
            salad: this.createEmptyAdjustments(),
            pasta: this.createEmptyAdjustments()
        };
        
        this.isInitialized = false;
    }
    
    // Create empty adjustment values
    createEmptyAdjustments() {
        return {
            // Side dish adjustments
            sides: {
                fries: 0,
                onion_rings: 0,
                side_salad: 0,
                rice: 0
            },
            // Drink adjustments
            drinks: {
                cola: 0,
                lemonade: 0,
                water: 0,
                iced_tea: 0
            },
            // Sauce adjustments
            sauces: {
                ketchup: 0,
                mayo: 0,
                bbq: 0,
                mustard: 0,
                none: 0
            }
        };
    }
    
    // Initialize agent - load from DB or create new
    async initialize() {
        try {
            // Try to load saved adjustments
            const savedModel = await loadAIModel('rl-agent');
            
            if (savedModel) {
                // Load existing adjustments
                this.adjustments = savedModel;
                console.log("Loaded existing RL agent adjustments");
            } else {
                // No saved model, use defaults
                console.log("No saved RL agent, using defaults");
                // Keep the default empty adjustments
            }
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("Error initializing RL agent:", error);
            // Fall back to defaults
            this.isInitialized = true;
            return false;
        }
    }
    
    // Adjust predictions from Brain.js
    adjust(mainDish, brainPrediction) {
        if (!this.isInitialized) {
            console.warn("RL agent not initialized, using Brain.js predictions directly");
            return brainPrediction;
        }
        
        // Get adjustments for this main dish
        const dishAdjustments = this.adjustments[mainDish];
        if (!dishAdjustments) {
            console.warn(`No adjustments for ${mainDish}, using Brain.js predictions directly`);
            return brainPrediction;
        }
        
        // Log raw predictions and adjustments
        console.log("Brain.js raw prediction:", brainPrediction);
        console.log("RL adjustments for", mainDish, ":", dishAdjustments);
        
        // Clone the Brain.js prediction to avoid modifying the original
        const adjusted = JSON.parse(JSON.stringify(brainPrediction));
        
        // Apply adjustments to sides
        this.applyAdjustments(adjusted.sides, dishAdjustments.sides);
        
        // Apply adjustments to drinks
        this.applyAdjustments(adjusted.drinks, dishAdjustments.drinks);
        
        // Apply adjustments to sauces
        this.applyAdjustments(adjusted.sauces, dishAdjustments.sauces);
        
        // Update the recommendation based on adjusted probabilities
        adjusted.recommendation = {
            side: adjusted.sides[0].item,
            drink: adjusted.drinks[0].item,
            sauce: adjusted.sauces[0].item
        };
        
        console.log("Adjusted prediction:", adjusted);
        
        return adjusted;
    }
    
    // Apply adjustments to a category
    applyAdjustments(categoryItems, adjustments) {
        // Apply adjustment to each item's probability
        categoryItems.forEach(item => {
            const adjustment = adjustments[item.item] || 0;
            item.probability += adjustment;
            
            // Ensure probability stays reasonable
            item.probability = Math.max(0.01, Math.min(0.99, item.probability));
        });
        
        // Re-sort by adjusted probability
        categoryItems.sort((a, b) => b.probability - a.probability);
    }
    
    // Learn from user choice
    async learn(mainDish, recommendation, userChoice) {
        if (!this.isInitialized) {
            console.warn("RL agent not initialized, cannot learn");
            return;
        }
        
        console.log("Learning from user choice:", {
            mainDish,
            recommendation,
            userChoice
        });
        
        // Get adjustments for this main dish
        const dishAdjustments = this.adjustments[mainDish];
        
        // Learn for each category
        this.learnCategory(dishAdjustments.sides, recommendation.side, userChoice.side);
        this.learnCategory(dishAdjustments.drinks, recommendation.drink, userChoice.drink);
        this.learnCategory(dishAdjustments.sauces, recommendation.sauce, userChoice.sauce);
        
        // Save updated adjustments
        await this.saveAdjustments();
        
        console.log("Updated adjustments:", this.adjustments[mainDish]);
    }
    
    // Learn for a specific category
    learnCategory(categoryAdjustments, recommendedItem, chosenItem) {
        // If user accepted recommendation, reinforce it
        if (recommendedItem === chosenItem) {
            categoryAdjustments[recommendedItem] += this.learningRate * 0.1;
        } else {
            // User chose something else - decrease recommended item
            categoryAdjustments[recommendedItem] -= this.learningRate * 0.2;
            
            // Increase chosen item
            categoryAdjustments[chosenItem] += this.learningRate * 0.3;
        }
    }
    
    // Save adjustments to IndexedDB
    async saveAdjustments() {
        try {
            await saveAIModel('rl-agent', this.adjustments);
            console.log("Saved RL agent adjustments");
            return true;
        } catch (error) {
            console.error("Error saving RL agent adjustments:", error);
            return false;
        }
    }
}

// Create and export singleton instance
const rlAgent = new ReinforcementAgent();
export default rlAgent;