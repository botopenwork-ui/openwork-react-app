import React from "react";
import './BlueButton.css';

const BlueButton = ({label, onClick, icon, style, amount}) => {
    return (
        <button className={`blue-button ${label == 'Lock' ?'lock-button':''}`} style={style} onClick={onClick}>
            {!amount ?
            <>
                <img src={icon} alt="" />
                <span>{label}</span>
            </>:
            <div className="amount-button">
                <span>{label}</span>
                <span className="release-amount">{amount}</span>
                <img src="/xdc.svg" alt="" />
            </div>}
        </button>
    )
}

export default BlueButton;