import React from "react";
import './ToolTipMilestone.css';

export default function ToolTipMilestone({title, address, amount}) {
    return (
        <div className="tooltip-milestone">
            <span>{title}</span>
            {address && <span className="wallet-address">{address}</span>}
            <div className="milestone-amount">
                <span>{amount}</span>
                <img src="/xdc.svg" alt="" />
            </div>
        </div>
    )
}