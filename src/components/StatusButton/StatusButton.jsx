import React from "react";
import './StatusButton.css';

export default function StatusButton({status, statusCss}) {
    return (
        <div className={`status-button ${status == "In Progress" ? 'status-progress' : ''} ${statusCss}`}>
            {status}
        </div>
    )
}