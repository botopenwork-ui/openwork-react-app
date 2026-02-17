import {React, useState} from "react";

import './VoteItem.css';

export default function VoteItem({name, imgSrc, status, date, content}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="milestone">
            <div className="milestone-header" onClick={() => {setOpen(!open)}}>
                <div className="milestone-header-content vote-header-content">
                    <div className="milestone-title vote-profile">
                        <img src={imgSrc} alt="" />
                        <div style={{display: 'flex', alignItems:'center', gap:'5px'}}>
                            <span>{name}</span>
                            {status ? "voted " : " "}
                            {status == "favour" ?
                                <>
                                    <span className="favour"> in favour</span>
                                    <img src="/favour.svg" alt="" />
                                </>
                                :
                                <>
                                    <span className="against"> against</span>
                                    <img src="/against.svg" alt="" />
                                </>
                            }
                        </div>
                    </div>
                    <div className="milestone-amount">
                        {date && <>
                        <span style={{fontSize:'12px', color:'#868686', marginLeft:'40px'}}>{date}</span>
                        </>}
                    </div>
                </div>
                <div className="arrow-icon">
                    <img src={`/${open?'arrayup.svg':'array.svg'}`} alt="" width={10} height={5}/>
                </div>
            </div>
            {open && 
                (<div className="voteitem-body">
                    <div className="voteitem-body-content">
                        <span className="voteitem-reason">REASON</span>
                        <span>{content}</span>
                    </div>
                    <a href="/profile" className="view-profile">
                        <span>View Profile</span>
                        <img src="/view_profile.svg" alt="" />
                    </a>
                </div>)
            }
        </div>
    )
}