// components/MultiBranding.jsx
import React, { useState, useEffect, useMemo } from "react";
import { LuSearch } from "react-icons/lu";
import { formGroupStyle, inputStyle, labelStyle } from "../styles";
import { colors } from "../styles/colors";

// --- Styles ---
const selectStyle = {
  ...inputStyle,
  width: "100%",
};

const searchContainerStyle = {
  position: "relative",
  marginBottom: "10px",
};

const searchIconStyle = {
  position: "absolute",
  top: "12px",
  left: "10px",
  color: "#999",
};

const searchInputStyle = {
  ...inputStyle,
  paddingLeft: "35px",
};

const itemListStyle = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  maxHeight: "200px",
  overflowY: "auto",
};

const itemStyle = {
  padding: "8px 12px",
  cursor: "pointer",
  borderBottom: `1px solid ${colors.border}`,
};

// --- Main Component ---
export default function MultiBranding({ apiToken, branchId, onTargetChange }) {
  const [type, setType] = useState(""); // 'page' or 'group'
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [manualId, setManualId] = useState("");

  // Fetch data when the selected type changes
  useEffect(() => {
    if (!type || !apiToken || !branchId) {
      setItems([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setSelectedId(""); // Reset selection when type changes
      setSearchTerm("");
      try {
        let url = "";
        if (type === "group") {
          url = "https://app.staffbase.com/api/branch/groups";
        } else if (type === "page") {
          url = `https://app.staffbase.com/api/branch/installations`;
        }

        const response = await fetch(url, {
          headers: { Authorization: `Basic ${apiToken}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}s: ${response.statusText}`);
        }

        const result = await response.json();
        let processedData = [];

        if (type === "group") {
          processedData = result.data.map((group) => ({
            id: group.id,
            name: group.config?.localization?.en_US?.title || group.name,
          }));
        } else if (type === "page") {
          processedData = result.data
            .filter((inst) => inst.pluginId === "page")
            .map((page) => ({
              id: page.id,
              name: page.title,
            }));
        }
        setItems(processedData);
      } catch (error) {
        console.error(error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type, apiToken, branchId]);

  // Notify parent component of the final target ID
  useEffect(() => {
    const finalId = manualId.trim() || selectedId;
    onTargetChange({
      type: finalId ? type : null,
      id: finalId,
    });
  }, [selectedId, manualId, type, onTargetChange]);

  // Memoized filtered list for performance
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  return (
    <div
      style={{
        padding: "10px",
        border: `1px solid ${colors.border}`,
        borderRadius: "4px",
        marginTop: "10px",
        marginBottom: "10px",
      }}
    >
      <div style={formGroupStyle}>
        <label style={labelStyle}>Target Type:</label>
        <select
          style={selectStyle}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Select a type...</option>
          <option value="page">Page</option>
          <option value="group">Group</option>
        </select>
      </div>

      {type && (
        <>
          <div style={{ opacity: manualId.trim() ? 0.5 : 1 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Select a {type}:</label>
              <div style={searchContainerStyle}>
                <LuSearch size={18} style={searchIconStyle} />
                <input
                  type="text"
                  style={searchInputStyle}
                  placeholder={`Search through ${items.length} ${type}s...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!!manualId.trim()}
                />
              </div>
            </div>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <ul style={itemListStyle}>
                {filteredItems.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      ...itemStyle,
                      backgroundColor:
                        selectedId === item.id ? colors.primaryLight : "transparent",
                      color:
                        selectedId === item.id ? colors.textOnPrimary : "inherit",
                    }}
                    onClick={() => !manualId.trim() && setSelectedId(item.id)}
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ ...formGroupStyle, marginTop: "15px" }}>
            <label style={labelStyle}>Or manually enter ID:</label>
            <input
              type="text"
              style={inputStyle}
              placeholder={`Manually enter ${type} ID`}
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}