import React from "react";
import './SkillBox.css'

export default function SkillBox({title, verified}) {
    return (
        <div className="box">
            <span>{title}</span>
            {verified && <img src="/verified.svg" alt="" />}
        </div>
    )
}