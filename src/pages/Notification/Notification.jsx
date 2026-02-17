import React from "react";
import DropDown from "../../components/DropDown/DropDown";

import "./Notification.css";
import JobItem from "../../components/JobItem/JobItem";

const FILTERITEMS = [
    'All', 'F1','F2'
]

const JOBITEMS = [
    {
        icon: 'user.png',
        inform: 'Mollie submitted an application!',
        devName: 'Mollie Hall',
        time: 20,
    },
    {
        icon: 'user.png',
        inform: 'Jollie just paid you',
        devName: 'Jollie Hall',
        time: 20,
        payAmount: 28.762
    },
    {
        icon: 'user.png',
        inform: 'Mollie submitted an application!',
        devName: 'Mollie Hall',
        time: 20,
    },
    {
        icon: 'user.png',
        inform: 'Mollie submitted an application!',
        devName: 'Mollie Hall',
        time: 20,
    }
]

export default function Notification() {
    return (
        <div className="notification-form">
            <div className="notification-header">
                <span>Notifications</span>
                <DropDown label={FILTERITEMS[0]} options={FILTERITEMS}/>
            </div>
            <div className="notification-body">
                {
                    JOBITEMS.map((item, index) => (
                        <>
                            <JobItem key={index} icon={item.icon} inform={item.inform} devName={item.devName} time={item.time} payAmount={item.payAmount}/>
                            {index != JOBITEMS.length-1 && (<span className="item-line"></span>)}
                        </>
                    ))
                }
            </div>
        </div>
    )
}