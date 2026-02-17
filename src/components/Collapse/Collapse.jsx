import {React, useState} from "react";
import './Collapse.css';

export default function Collapse({title, content}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="collapse-form">
            <div className="collapse-title" onClick={() => setOpen(!open)}>
                <span>{title}</span>
                <img src={`${open?'/arrayup.svg':'array.svg'}`} alt="" width={10}/>
            </div>
            {open && <div className="collapse-content">{content}</div>}
        </div>
    )
}