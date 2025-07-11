// components/UseEnvironmentOptions.jsx
// Choose which action to take with the environment.

import React from "react";
import { brandingButtonStyle } from "../styles";

export default function UseEnvironmentOptions({ slug, onChoose }) {
  return (
    <div
      style={{
        marginBottom: 20,
        border: "1px solid #ccc",
        borderRadius: 4,
        padding: 15,
      }}
    >
      <p>What would you like to do with the environment “{slug}”?</p>
      <button
        style={brandingButtonStyle}
        onClick={() => onChoose("new")}
      >
        Set Up
      </button>
      <button
        style={brandingButtonStyle}
        onClick={() => onChoose("existing")}
      >
        Brand
      </button>
      <button
        style={brandingButtonStyle}
        onClick={() => onChoose("users")}
      >
        Update Users
      </button>
    </div>
  );
}
