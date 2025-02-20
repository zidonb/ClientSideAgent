document.addEventListener("DOMContentLoaded", function () {
    
    // Get UI elements
    const mainDishSelect = document.getElementById("food-category");
    const sideDishSelect = document.getElementById("side");
    const drinkSelect = document.getElementById("drink");
    const sauce1Select = document.getElementById("sauce1");
    const sauce2Select = document.getElementById("sauce2");

    const confirmSideCheckbox = document.getElementById("confirm-side");
    const confirmDrinkCheckbox = document.getElementById("confirm-drink");
    const confirmSaucesCheckbox = document.getElementById("confirm-sauces");

    // Listen for changes in any selection
    const addEventListenerIfExists = (element, event, handler) => {
        if (element) {
            element.addEventListener(event, handler);
        }
    };

    addEventListenerIfExists(mainDishSelect, "change", updateAIRecommendations);
    addEventListenerIfExists(sideDishSelect, "change", updateAIRecommendations);
    addEventListenerIfExists(drinkSelect, "change", updateAIRecommendations);
    addEventListenerIfExists(sauce1Select, "change", updateAIRecommendations);
    addEventListenerIfExists(sauce2Select, "change", updateAIRecommendations);

    function updateAIRecommendations() {
        let mainDish = mainDishSelect.value;
        let sideDish = confirmSideCheckbox.checked ? sideDishSelect.value : null;
        let drink = confirmDrinkCheckbox.checked ? drinkSelect.value : null;
        let sauces = confirmSaucesCheckbox.checked ? 
            {
                sauce1: sauce1Select.value,
                sauce2: sauce2Select.value
            } : null;

        // Call AI model to get recommendations
        let aiSuggestions = getAISuggestions(mainDish, sideDish, drink, sauces);

        // Update only unchecked fields
        if (!confirmSideCheckbox.checked && aiSuggestions.sideDish) {
            sideDishSelect.value = aiSuggestions.sideDish;
        }
        if (!confirmDrinkCheckbox.checked && aiSuggestions.drink) {
            drinkSelect.value = aiSuggestions.drink;
        }
        if (!confirmSaucesCheckbox.checked && aiSuggestions.sauces) {
            sauce1Select.value = aiSuggestions.sauces.sauce1 || "";
            sauce2Select.value = aiSuggestions.sauces.sauce2 || "";
        }
    }

    function getAISuggestions(mainDish, sideDish, drink, sauces) {
        // Placeholder function for AI (to be implemented in Step 2)
        return {
            sideDish: "fries",
            drink: "cola",
            sauces: {
                sauce1: "ketchup",
                sauce2: "mayo"
            }
        };
    }
});