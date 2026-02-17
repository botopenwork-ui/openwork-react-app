import React from "react";
import './WorkSubmission.css';
import { useState } from "react";

export default function WorkSubmission({title, date, content, image, attachments = []}) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <div className={`work-submission-header ${!open && "header-close"}`} onClick={() => {
                setOpen(!open);
            }}>
                <div className="submission-title">
                    <span>{title}</span>
                    <span className="date">{date}</span>
                </div>
                <img src={open ? `/arrayup.svg` : `/array.svg`} alt="arry" />
            </div>
            {open && (<div className="work-submission-body">
                {image && <img src={image} alt="Work submission" />}
                <div className="submission-content">
                    {content}
                </div>
                {attachments.length > 0 && (
                    <div className="submission-attachments">
                        <span className="attachments-label">Attachments:</span>
                        <div className="attachments-list">
                            {attachments.map((file, index) => (
                                <a
                                    key={index}
                                    href={`https://gateway.lighthouse.storage/ipfs/${file.ipfsHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="attachment-link"
                                >
                                    <img src="/attachments.svg" alt="" />
                                    <span>{file.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>)}
        </div>
    )
}