// styles.js

import { colors } from './colors';

const transitionEffect = 'background-color 0.2s ease-in-out, color 0.2s ease-in-out';

export const inputStyle = {
  padding: "8px",
  margin: "5px 0",
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  width: "calc(100% - 18px)",
  boxSizing: "border-box",
};
export const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  color: colors.textDark,
};
export const apiKeyLabelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "normal",
  fontSize: "0.8em",
  color: colors.textMuted,
  wordBreak: "break-all",
};
export const apiKeyInputStyle = {
  ...inputStyle,
  border: `1px solid ${colors.border}`,
  fontSize: "0.9em",
  color: colors.textMedium,
  backgroundColor: colors.backgroundLight,
};
export const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "5px",
  fontWeight: "normal",
};
export const checkboxStyle = { marginRight: "8px" };
export const buttonStyle = {
  backgroundColor: colors.primary,
  color: colors.textOnPrimary,
  padding: "10px 15px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "16px",
  marginTop: "15px",
  transition: transitionEffect,
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
export const dangerButtonStyle = { 
  ...buttonStyle, 
  backgroundColor: colors.danger,
};
export const responseStyle = {
  marginTop: "20px",
  padding: "10px",
  border: `1px solid ${colors.borderLight}`,
  borderRadius: "4px",
  backgroundColor: colors.backgroundLight,
  whiteSpace: "pre-wrap",
  fontFamily: "monospace",
  fontSize: "10px",
};
export const containerStyle = { 
  padding: "15px", 
  fontFamily: "sans-serif",
};
export const headingStyle = {
  color: colors.textDark,
  marginBottom: "10px",
  textAlign: "center",
};
export const formGroupStyle = { marginBottom: "15px" };
export const savedTokenStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: `1px solid ${colors.borderLight}`,
};
export const buttonsContainerStyle = { display: "flex", gap: "10px" };
export const buttonTinyStyle = {
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: 0,
  color: colors.primary,
  transition: 'color 0.2s ease-in-out',
};
export const dropdownHeaderStyle = {
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 24,
};
export const psaStyle = {
  marginTop: '15px',
  padding: '10px',
  backgroundColor: colors.backgroundSubtle,
  borderRadius: '4px',
  fontSize: '12px',
  color: colors.textDark,
  lineHeight: '1.4',
};
export const subDescriptionStyle = {
  fontSize: '13px',
  color: colors.textMedium,
  marginTop: '5px',
  marginBottom: '10px',
  lineHeight: '1.4',
};
export const logoStyle = {
  width: '100px',
  marginBottom: '5px',
};