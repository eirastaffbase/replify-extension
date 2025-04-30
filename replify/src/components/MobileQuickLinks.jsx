// components/MobileQuickLinks.jsx
import React from "react";
import { inputStyle } from "../styles";

/**
 * @param {object}   links             { key: { title, position } }
 * @param {Function} onChangeTitle     (key, newTitle)
 * @param {Function} onSwap            (keyA, keyB)
 */
export default function MobileQuickLinks({ links, onChangeTitle, onSwap }) {
  const ordered = Object.entries(links).sort(([, a], [, b]) => a.position - b.position);

  return ordered.map(([key, link], idx) => (
    <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
      <input
        style={{ ...inputStyle, flex: 1 }}
        value={link.title}
        onChange={(e) => onChangeTitle(key, e.target.value)}
      />
      <button
        disabled={idx === 0}
        onClick={() => idx !== 0 && onSwap(key, ordered[idx - 1][0])}
      >
        ↑
      </button>
      <button
        disabled={idx === ordered.length - 1}
        onClick={() =>
          idx !== ordered.length - 1 && onSwap(key, ordered[idx + 1][0])
        }
      >
        ↓
      </button>
    </div>
  ));
}
