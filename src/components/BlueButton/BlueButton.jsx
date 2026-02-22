import React from "react";
import './BlueButton.css';

const BlueButton = ({ label, onClick, icon, style, amount, disabled }) => {
    return (
        <button
            className={`blue-button ${label === 'Lock' ? 'lock-button' : ''} ${disabled ? 'blue-button--disabled' : ''}`}
            style={{ ...style, opacity: disabled ? 0.6 : (style?.opacity ?? 1), cursor: disabled ? 'not-allowed' : 'pointer' }}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            {!amount ? (
                <>
                    <img src={icon} alt="" />
                    <span>{label}</span>
                </>
            ) : (
                <div className="amount-button">
                    <span>{label}</span>
                    <span className="release-amount">{amount}</span>
                    <img src="/xdc.svg" alt="" />
                </div>
            )}
        </button>
    );
};

export default BlueButton;
