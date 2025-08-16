export const inputStyle = {
  padding: "8px",
  margin: "5px 0",
  border: "1px solid #ccc",
  borderRadius: "4px",
  width: "calc(100% - 18px)",
  boxSizing: "border-box",
};
export const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
};
export const apiKeyLabelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "normal",
  fontSize: "0.8em",
  color: "#777",
  wordBreak: "break-all",
};
export const apiKeyInputStyle = {
  ...inputStyle,
  border: "1px solid #ddd",
  fontSize: "0.9em",
  color: "#555",
  backgroundColor: "#f8f8f8",
};
export const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "5px",
  fontWeight: "normal",
};
export const checkboxStyle = { marginRight: "8px" };
export const buttonStyle = {
  backgroundColor: "#00A4FD",
  color: "white",
  padding: "10px 15px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "16px",
  marginTop: "15px",
};
export const brandingButtonStyle = {
  ...buttonStyle,
  display: "inline-block",
  marginRight: "10px",
};
export const actionButtonStyle = {
  padding: "6px 10px",
  fontSize: "12px",
  marginRight: "5px",
};
export const dangerButtonStyle = { ...buttonStyle, backgroundColor: "#dc3545" };
export const responseStyle = {
  marginTop: "20px",
  padding: "10px",
  border: "1px solid #eee",
  borderRadius: "4px",
  backgroundColor: "#f9f9f9",
  whiteSpace: "pre-wrap",
  fontFamily: "monospace",
  fontSize: "10px",
};
export const containerStyle = { padding: "15px", fontFamily: "sans-serif" };
export const headingStyle = {
  color: "#333",
  marginBottom: "10px",
  textAlign: "center",
};
export const formGroupStyle = { marginBottom: "15px" };
export const savedTokenStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #eee",
};
export const buttonsContainerStyle = { display: "flex", gap: "10px" };
export const buttonTinyStyle = {
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: 0,
};
export const dropdownHeaderStyle = {
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 24,
};
export const psaStyle = {
  marginTop: '15px',
  padding: '10px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#333',
  lineHeight: '1.4',
};
export const subDescriptionStyle = {
  fontSize: '13px',
  color: '#555',
  marginTop: '5px',
  marginBottom: '10px',
  lineHeight: '1.4',
};
export const logoStyle = {
  width: '150px',
  marginBottom: '10px',
  transition: 'transform 0.2s ease-in-out',
  transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
  cursor: 'pointer', 
};