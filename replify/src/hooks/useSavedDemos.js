// hooks/useSavedDemos.js
// This hook manages saved demos in local storage.

import { useEffect, useState } from "react";

export default function useSavedDemos() {
  const [demos, setDemos] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem("savedDemos");
    if (raw) setDemos(JSON.parse(raw));
  }, []);

  const updateDemos = updater => {
    setDemos(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("savedDemos", JSON.stringify(next));
      return next;
    });
  };

  return [demos, updateDemos];
}
