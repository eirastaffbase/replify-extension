// components/MobileQuickLinks.jsx
import React from "react";
import { inputStyle, buttonTinyStyle } from "../styles";

/**
 * @typedef {{ name:string, title:string, position:number }} QuickLink
 *
 * @param {QuickLink[]}                          links
 * @param {(idx:number, field:keyof QuickLink, value:any)=>void} onChange
 * @param {(a:number,b:number)=>void}           onSwap
 * @param {(idx:number)=>void}                  onDelete
 * @param {()=>void}                            onAdd
 */
export default function MobileQuickLinks({
  links,
  onChange,
  onSwap,
  onDelete,
  onAdd,
}) {
  const ordered = [...links].sort((a, b) => a.position - b.position);

  return (
    <div>
      {ordered.map((link, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 24px 24px 24px",
            gap: 6,
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          {/* internal menu‑item key */}
          <input
            style={{ ...inputStyle, fontSize: 12 }}
            placeholder="Menu item name"
            value={link.name}
            onChange={(e) => onChange(idx, "name", e.target.value)}
          />

          {/* mobile label */}
          <input
            style={{ ...inputStyle, fontSize: 12 }}
            placeholder="Mobile label"
            value={link.title}
            onChange={(e) => onChange(idx, "title", e.target.value)}
          />

          {/* move up / down */}
          <button
            style={buttonTinyStyle}
            disabled={idx === 0}
            onClick={() => onSwap(idx, idx - 1)}
          >
            ↑
          </button>
          <button
            style={buttonTinyStyle}
            disabled={idx === ordered.length - 1}
            onClick={() => onSwap(idx, idx + 1)}
          >
            ↓
          </button>

          {/* delete */}
          <button
            style={{ ...buttonTinyStyle, color: "crimson" }}
            onClick={() => onDelete(idx)}
          >
            ✖︎
          </button>
        </div>
      ))}

      {/* add new row */}
      <button
        onClick={onAdd}
        style={{
          marginTop: 6,
          marginBottom: 10,
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #00A4FD",
          background: "#fff",
          color: "#00A4FD",
          cursor: "pointer",
        }}
      >
        + Add
      </button>
    </div>
  );
}
