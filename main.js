// main.js - Connects UI with AI system

import aiCoordinator from './ai-coordinator.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Initializing AI Food Ordering Assistant...");
    
    // Initialize AI system
    await aiCoordinator.initialize();
    
    // UI Elements
    const foodCards = document.querySelectorAll('.food-card');
    const recommendationsSection = document.getElementById('recommendations');
    const sideOptions = document.getElementById('side-options').querySelectorAll('.option-chip');
    const drinkOptions = document.getElementById('drink-options').querySelectorAll('.option-chip');
    const sauceOptions = document.getElementById('sauce-options').querySelectorAll('.option-chip');
    const placeOrderButton = document.getElementById('place-order');
    const debugToggle = document.getElementById('debug-toggle');
    const debugPanel = document.getElementById('debug-panel');
    const debugContent = document.getElementById('debug-content');
    const debugClose = document.getElementById('debug-close');
    const learningIndicator = document.getElementById('learning-indicator');
    
    // Food card selection
    foodCards.forEach(card => {
        card.addEventListener('click', function() {
            // Clear previous selection
            foodCards.forEach(c => c.classList.remove('selected'));
            
            // Set new selection
            this.classList.add('selected');
            
            // Show recommendations section
            recommendationsSection.classList.add('recommendations-active');
            
            // Get AI recommendations
            const mainDish = this.dataset.value;
            showAIRecommendations(mainDish);
        });
    });
    
    // Option chip selection
    const allOptionChips = [...sideOptions, ...drinkOptions, ...sauceOptions];
    allOptionChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Get all chips in the same category
            const siblings = this.parentElement.querySelectorAll('.option-chip');
            
            // Clear previous selection
            siblings.forEach(s => s.classList.remove('selected'));
            
            // Set new selection
            this.classList.add('selected');
        });
    });
    
    // Place order button
    placeOrderButton.addEventListener('click', async function() {
        // Show learning indicator
        learningIndicator.classList.add('active');
        
        // Get selected food items
        const mainDish = document.querySelector('.food-card.selected').dataset.value;
        const side = document.querySelector('#side-options .option-chip.selected').dataset.value;
        const drink = document.querySelector('#drink-options .option-chip.selected').dataset.value;
        const sauce = document.querySelector('#sauce-options .option-chip.selected').dataset.value;
        
        // Process order
        const order = { side, drink, sauce };
        await aiCoordinator.processOrder(order);
        
        // Display success message
        alert('Order placed successfully! AI has learned from your choices.');
        
        // Update debug panel
        updateDebugPanel();
        
        // Hide learning indicator after 2 seconds
        setTimeout(() => {
            learningIndicator.classList.remove('active');
        }, 2000);
    });
    
    // Debug panel toggle
    debugToggle.addEventListener('click', function() {
        debugPanel.classList.toggle('active');
        updateDebugPanel();
    });
    
    // Debug panel close
    debugClose.addEventListener('click', function() {
        debugPanel.classList.remove('active');
    });
    
    // Function to display AI recommendations
    function showAIRecommendations(mainDish) {
        // Show learning indicator
        learningIndicator.classList.add('active');
        
        // Get recommendations from AI
        const recommendation = aiCoordinator.getRecommendations(mainDish);
        
        // Select recommended options
        selectOption('side', recommendation.recommendation.side);
        selectOption('drink', recommendation.recommendation.drink);
        selectOption('sauce', recommendation.recommendation.sauce);
        
        // Update debug panel
        updateDebugPanel();
        
        // Hide learning indicator after 1 second
        setTimeout(() => {
            learningIndicator.classList.remove('active');
        }, 1000);
    }
    
    // Helper function to select an option
    function selectOption(category, value) {
        const options = document.querySelectorAll(`#${category}-options .option-chip`);
        options.forEach(option => {
            if (option.dataset.value === value) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    // Function to update debug panel
    function updateDebugPanel() {
        debugContent.innerHTML = '';
        const debugInfo = aiCoordinator.getDebugInfo();
        
        debugInfo.forEach(message => {
            const item = document.createElement('div');
            item.classList.add('debug-item');
            
            // Extract timestamp
            const timestampMatch = message.match(/\[(.*?)\]/);
            if (timestampMatch) {
                const timestamp = document.createElement('span');
                timestamp.classList.add('debug-item-timestamp');
                timestamp.textContent = timestampMatch[0];
                
                const content = document.createElement('span');
                content.innerHTML = formatDebugMessage(message.replace(timestampMatch[0], '').trim());
                
                item.appendChild(timestamp);
                item.appendChild(content);
            } else {
                item.innerHTML = formatDebugMessage(message);
            }
            
            debugContent.appendChild(item);
        });
        
        // Auto-scroll to bottom
        debugContent.scrollTop = debugContent.scrollHeight;
    }
    
    // Format debug messages with highlighting
    function formatDebugMessage(message) {
        // Add color highlighting based on message content
        if (message.includes('Brain.js prediction scores:') || 
            message.includes('RL adjustments applied:') ||
            message.includes('Learning outcome:')) {
            // These are section headers
            return `<span class="debug-highlight">${message}</span>`;
        }
        
        // Indented group items
        if (message.startsWith('  ')) {
            return `<div class="debug-group">${message}</div>`;
        }
        
        // Special cases
        if (message.includes('suggests') || message.includes('adjustments -')) {
            return highlightValues(message);
        }
        
        if (message.includes('confidence')) {
            return highlightConfidence(message);
        }
        
        if (message.includes('accuracy')) {
            return highlightAccuracy(message);
        }
        
        if (message.includes('Side options:') || 
            message.includes('Drink options:') || 
            message.includes('Sauce options:')) {
            return formatProbabilities(message);
        }
        
        return message;
    }
    
    // Highlight recommendation values
    function highlightValues(message) {
        // Find the first colon that comes after "Side: "
        const sideIndex = message.indexOf("Side:");
        if (sideIndex === -1) return message;
        
        // Split the first part (before side) and the rest
        const prefix = message.substring(0, sideIndex + 5); // "Side:" is 5 characters
        const recommendations = message.substring(sideIndex + 5);
        
        return `${prefix}<span class="debug-highlight">${recommendations}</span>`;
    }
    
    // Format and highlight confidence values
    function highlightConfidence(message) {
        return message.replace(/(\d+\.\d+)%/g, (match) => {
            const value = parseFloat(match);
            let className = 'debug-error';
            
            if (value > 80) className = 'debug-success';
            else if (value > 50) className = 'debug-highlight';
            else if (value > 30) className = 'debug-warning';
            
            return `<span class="${className}">${match}</span>`;
        });
    }
    
    // Format and highlight accuracy values
    function highlightAccuracy(message) {
        return message.replace(/(\d+\.\d+)%/g, (match) => {
            const value = parseFloat(match);
            let className = 'debug-error';
            
            if (value > 80) className = 'debug-success';
            else if (value > 50) className = 'debug-highlight';
            else if (value > 30) className = 'debug-warning';
            
            return `<span class="${className}">${match}</span>`;
        }).replace(/✓/g, '<span class="debug-success">✓</span>')
          .replace(/✗/g, '<span class="debug-error">✗</span>');
    }
    
    // Format probability listings
    function formatProbabilities(message) {
        const colonPos = message.indexOf(':');
        if (colonPos === -1) return message;
        
        const prefix = message.substring(0, colonPos + 1);
        let values = message.substring(colonPos + 1).trim();
        
        // Format each probability
        values = values.replace(/([^,]+: \d+\.\d+%)/g, (match) => {
            const parts = match.split(':');
            const item = parts[0].trim();
            const probability = parseFloat(parts[1]);
            
            let className = 'debug-error';
            if (probability > 80) className = 'debug-success';
            else if (probability > 50) className = 'debug-highlight';
            else if (probability > 30) className = 'debug-warning';
            
            return `<span class="${className}">${item}: ${parts[1]}</span>`;
        });
        
        return `${prefix} ${values}`;
    }
});