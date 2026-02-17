import React from 'react';
import './RadioButton.css'; // Make sure to create this CSS file for styling

const RadioButton = ({ label, isSelected, onChange }) => {
  return (
    <label className="radio-button">
      <input
        type="radio"
        checked={isSelected}
        onChange={onChange}
        className="radio-input"
      />
      <span className={`radio-circle ${isSelected ? 'selected' : ''}`}></span>
      <span className="radio-label">{label}</span>
    </label>
  );
};

export default RadioButton;
