import React from "react";
import './TransactionItem.css';

export default function TransactionItem({title, address, icon}) {
    return (
        <div className="transaction-item">
            <span>{title}</span>
            <div className="transaction-address">
                <span>{address}</span>
                {icon && <img src="/blue-copy.svg" alt="" />}
            </div>
        </div>
    )
}