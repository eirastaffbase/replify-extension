// components/UseEnvironmentOptions.jsx
// Choose which action to take with the environment.

import { React, useState } from "react";
import { brandingButtonStyle } from "../styles";
import { colors } from "../styles/colors";

export default function UseEnvironmentOptions({ slug, onChoose }) {
  const [hoveredButton, setHoveredButton] = useState(null);

  return (
    <div
      style={{
        marginBottom: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 4,
        padding: 15,
      }}
    >
      <p>What would you like to do with the environment “{slug}”?</p>
      <button
        style={{
          ...brandingButtonStyle,
          backgroundColor: hoveredButton === 'new' ? colors.primaryLight : colors.primary,
        }}
        onClick={() => onChoose("new")}
        onMouseEnter={() => setHoveredButton('new')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        Set Up
      </button>
      <button
        style={{
          ...brandingButtonStyle,
          backgroundColor: hoveredButton === 'existing' ? colors.primaryLight : colors.primary,
        }}
        onClick={() => onChoose("existing")}
        onMouseEnter={() => setHoveredButton('existing')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        Brand
      </button>
      <button
        style={{
          ...brandingButtonStyle,
          backgroundColor: hoveredButton === 'users' ? colors.primaryLight : colors.primary,
        }}
        onClick={() => onChoose("users")}
        onMouseEnter={() => setHoveredButton('users')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        Update Users
      </button>
    </div>
  );
}