import React from "react";
import "./PaymentItem.css"

export default function PaymentItem({title}) {
    return (
       <div className="payment-item">
        <div className="title">
            <span>{title}</span>
            <img src="/array.svg" alt="" />
        </div>
        <div className="detail">
            <span>25</span>
            <img src="/xdc.svg" alt="" />
            <span className="date">. 7 May, 2024</span>
        </div>
       </div> 
    )
}