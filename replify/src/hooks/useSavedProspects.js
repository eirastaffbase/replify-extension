// hooks/useSavedProspects.js
import { useState, useEffect } from "react";
import {
  loadProspectsFromStorage,
  saveProspectsToStorage,
} from "../utils/prospectStorage";

export default function useSavedProspects() {
  const [prospects, setProspects] = useState([]);

  // Initial load from local storage
  useEffect(() => {
    setProspects(loadProspectsFromStorage());
  }, []);

  // Synced setter that updates state and local storage
  const updateProspects = (updater) => {
    setProspects((prev) => {
      const nextState =
        typeof updater === "function" ? updater(prev) : updater;
      saveProspectsToStorage(nextState);
      return nextState;
    });
  };

  return [prospects, updateProspects];
}