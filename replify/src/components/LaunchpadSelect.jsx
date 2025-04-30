// components/LaunchpadSelect.jsx
// Reusable multi-select dropdown for the Launchpad list.

import React from "react";
import { inputStyle, checkboxLabelStyle, checkboxStyle } from "../styles";

/**
 * @param {string[]}  items           all available launchpad entries
 * @param {string[]}  selected        the current selection array
 * @param {boolean}   open            dropdown open / closed
 * @param {Function}  onToggleOpen    () => void       open/close
 * @param {Function}  onToggleItem    (item:string)    add / remove
 */
export default function LaunchpadSelect({
  items,
  selected,
  open,
  onToggleOpen,
  onToggleItem,
}) {
  // helpers -------------------------------------------------------------
  const isSelected = (opt) => selected.includes("all") || selected.includes(opt);

  const getLabel = () => {
    if (selected.includes("all")) return "All";
    if (!selected.length) return "Select Items";
    const shown = items.filter((i) => selected.includes(i));
    return shown.length > 2
      ? `${shown.slice(0, 2).join(", ")} +${shown.length - 2}`
      : shown.join(", ");
  };

  // markup --------------------------------------------------------------
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        style={{
          ...inputStyle,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={onToggleOpen}
      >
        {getLabel()}
        <span>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 4,
            zIndex: 10,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {/* “All” option */}
          <label
            style={{
              ...checkboxLabelStyle,
              padding: 8,
              borderBottom: "1px solid #eee",
            }}
          >
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={selected.includes("all")}
              onChange={() => onToggleItem("all")}
            />
            All
          </label>

          {/* individual items */}
          {items.map((opt) => (
            <label
              key={opt}
              style={{
                ...checkboxLabelStyle,
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={isSelected(opt)}
                onChange={() => onToggleItem(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
