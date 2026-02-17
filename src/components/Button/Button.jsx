import React from 'react';
import './Button.css';

const Button = ({ label, onClick, icon, buttonCss}) => {
  return (
    <button className={`custom-button ${buttonCss}`} onClick={onClick}>
      {icon && <img src={icon} alt="" />}
      {label && <span>{label}</span>}
    </button>
  );
};

export default Button;
