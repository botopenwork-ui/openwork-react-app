import React from "react";
import DropDown from "../../components/DropDown/DropDown";

import "./Notification.css";

const FILTERITEMS = [
    'All', 'F1','F2'
]

export default function Notification() {
    return (
        <div className="notification-form">
            <div className="notification-header">
                <span>Notifications</span>
                <DropDown label={FILTERITEMS[0]} options={FILTERITEMS}/>
            </div>
            <div className="notification-body">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', color: '#888' }}>
                    <p style={{ fontSize: '15px', marginBottom: '8px' }}>No notifications yet.</p>
                    <p style={{ fontSize: '13px', color: '#aaa' }}>Activity related to your jobs and proposals will appear here.</p>
                </div>
            </div>
        </div>
    )
}
