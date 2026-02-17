import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json";
import "./ViewAnyApplication.css";
import Button from "../../components/Button/Button";
import VoteBar from "../../components/VoteBar/VoteBar";
import BackButton from "../../components/BackButton/BackButton";
import StatusButton from "../../components/StatusButton/StatusButton";
import Milestone from "../../components/Milestone/Milestone";

function JobdetailItem ({title, icon , amount, token}) {
  return (
    <div className="job-detail-item">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span className="job-detail-item-title">{title}</span>
        {icon && <img src="/fee.svg" alt="" />}
      </div>
      <div id="fetchedAmounts">
          {amount}{" "}
        <img src={token?"/token.svg":"/xdc.svg"} alt="USDC" className="usdc-iconJD" />
      </div>
    </div>
  )
}

function ATTACHMENTS({title}) {
    return (
      <div className="attachment-form">
        <img src="/attachments.svg" alt="" />
        <span>{title}</span>
      </div>
    )
  }

export default function ViewAnyApplication() {

  return (
    <>
      <div className="release-payment-container">
        <div className="form-container-release">
        <div className="form-header" style={{marginTop:'109px'}}>
          <BackButton to={`/job-update`} style={{gap: '20px'}} title="Job Application"/>
          <StatusButton status={'Accepted'}/>
        </div>
          <div className="form-body">
            <div className="job-show-details">
                <span>UI for OpenWOrk</span>
                <div className="show-details">
                    <span>Show Details</span>
                    <img src="/array.svg" alt="" />
                </div>
            </div>
            <div>
                <div className="detail-row">
                    <span className="detail-label">APPLICATION SUBMITTED BY</span>
                    <div className="detail-profile">
                    <span className="detail-value-address">
                        <img src="/person.svg" alt="JobGiver" className="Job" />
                        <p>You</p>
                    </span>
                    </div>
                </div>
            </div>
            <div>
                <div className="detail-row">
                    <span className="detail-label">DESCRIPTION</span>
                    <div className="detail-value description-value">
                        <p>I'm a Product Designer based in Melbourne, Australia. I enjoy working on product design, design systems, and Webflow projects, but I don't take myself too seriously.</p>
                    </div>
                </div>
            </div>
            <div>
                <div className="detail-row category">
                    <span>ATTACHMENTS</span>
                    <div className="upload-content">
                        <ATTACHMENTS title={'Scope of work.pdf'}/>
                        <ATTACHMENTS title={'Reference 1.png'}/>
                    </div>
                </div>
            </div>
            <div className="milestone-section">
                <div className="milestone-section-header">
                    <span>MILESTONES</span>
                </div>
                <div className="milestone-section-body">
                    <Milestone amount={25} title="Milestone 1" content={"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."} editable={true}/>
                    <Milestone amount={25} title="Milestone 2" content={"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."} editable={true}/>
                </div>
            </div>
            <div className="form-platformFee">
              <div className="platform-fee">
                <span>REVISED COST</span>
                <img src="/fee.svg" alt="" />
              </div>
              <div className="compensation-amount">
                <span>250</span>
                <img src="/xdc.svg" alt="USDC" className="usdc-iconJD" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
