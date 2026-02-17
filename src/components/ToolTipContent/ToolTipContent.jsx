import React from "react";
import './ToolTipContent.css';
import SkillBox from "../SkillBox/SkillBox";

export default function ToolTipContent ({name, point, role, content}) {
    return (
        <div className="tooltip-form">
            <div className="tooltip-header">
                <div className="tooltip-username">
                    <span>{name}</span>
                    {role == 'Taker' && <div className="tooltip-star">
                        <span>{point}</span>
                        <img src="/star.png" alt="" width={14}/>
                    </div>}
                </div>
                <span className="tooltip-user-role">Job {role}</span>
            </div>
            {role == 'Taker' && <div className="tooltip-skill">
                <SkillBox title='UX Design'/>
                <SkillBox title='Webflow'/>
                <SkillBox title='+ 5 more'/>
            </div>}
            <div className="tooltip-body">
                {content}
            </div>
            <a href="" className="view-profile">
                <span>View Profile</span>
                <img src="/view_profile.svg" alt="" />
            </a>
        </div>
    )
}