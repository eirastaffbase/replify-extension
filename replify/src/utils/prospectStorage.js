// utils/prospectStorage.js
/**
 * Loads the array of saved prospects from browser's local storage.
 * @returns {Array} The array of prospects, or an empty array if none are found.
 */
export const loadProspectsFromStorage = () => {
    try {
      const serializedProspects = localStorage.getItem("savedProspects");
      if (serializedProspects === null) {
        return [];
      }
      return JSON.parse(serializedProspects);
    } catch (err) {
      console.error("Error loading prospects from storage:", err);
      return [];
    }
  };
  
  /**
   * Saves the array of prospects to the browser's local storage.
   * @param {Array} prospects - The array of prospect objects to save.
   */
  export const saveProspectsToStorage = (prospects) => {
    try {
      const serializedProspects = JSON.stringify(prospects);
      localStorage.setItem("savedProspects", serializedProspects);
    } catch (err) {
      console.error("Error saving prospects to storage:", err);
    }
  };