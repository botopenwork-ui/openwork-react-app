import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./VoteSubmission.css";
import VoteItem from "../../components/VoteItem/VoteItem";
import ProgressBar from "../../components/ProgressBar/ProgressBar";
import DropDown from "../../components/DropDown/DropDown";

export default function VoteSubmission() {

const FILTERITEMS = [
    'All', 'F1','F2'
]
  return (
    <>
        <div className="newTitle">
         <div className="titleTop">
          <Link className="goBack" to={`/profile-owner-view`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText">UX Skill Oracle Application</div>
          <Link className="goBack" to={`/profile-owner-view`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
         </div>
       </div>

      <div className="release-payment-container" style={{width:536}}>
        <div className="form-container-release">
          <div className="sectionTitle accuracy">
            <span id="rel-title" style={{paddingTop:'0px'}}>Vote Submissions</span>
            <DropDown label={FILTERITEMS[0]} options={FILTERITEMS}/>
          </div>
          <div className="release-payment-body payment-history-body">
            <VoteItem imgSrc={'/user.png'} name='mollie2504' status={'favour'} date={'7 May, 2024'} content={'I think this person should be removed from the Skill Oracle because they are not at all active!'}/>
            <VoteItem imgSrc={'/user.png'} name='mollie2504' status={'against'} date={'7 May, 2024'} content={'I think this person should be removed from the Skill Oracle because they are not at all active!'}/>          </div>
        </div>
      </div>
    </>
  );
}
