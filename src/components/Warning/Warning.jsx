import React from "react";
import './Warning.css';

export default function Warning({content, icon="/orange-warning.svg"}) {
    return (
        <div className="warning-content">
            <img src={icon} alt="" />
            <span>{content}</span>
        </div>
    )
}