import React, { useState } from "react";
import "./AddMember.css";
import BackButton from "../../components/BackButton/BackButton";
import BlueButton from "../../components/BlueButton/BlueButton";
import DropDown from "../../components/DropDown/DropDown";

const SKILLITEMS = [
    'General Skill Oracle','UX/UI Design','UX/UI Design'
]

export default function AddMember() {
  const [updateText, setUpdateText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [memberAddress, setMemberAddress] = useState(""); 

  return (
    <>
      <div className="form-containerDC form-post">
        <div className="form-header" style={{marginTop:'50px'}}>
          <BackButton to={`/members-skill-oracles`} style={{gap: '20px'}} title="Skill Oracle Recruitment Proposal"/>
        </div>
        <div className="form-body">
          <form>
            <div className="form-groupDC payment-history-body" style={{marginTop:'8px'}}>
                <DropDown label={SKILLITEMS[0]} options={SKILLITEMS} customCSS={'form-dropdown profile-dropdown'}/>
            </div>
            <div className="form-groupDC">
                <div className="add-member-address">
                    <input
                      type="text"
                      placeholder="Enter wallet address (0x...)"
                      value={memberAddress}
                      onChange={(e) => setMemberAddress(e.target.value)}
                      style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
                    />
                </div>
            </div>
            <div className="form-groupDC">
              
              <input
                type="text"
                placeholder="Email ID / Telegram ID of this person"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <div className="form-groupDC">
              
              <textarea
                placeholder="Reason explaining why this person should be recruited"
                value={updateText}
              ></textarea>
            </div>
            <BlueButton label={'Submit Proposal'} style={{padding: '8px 16px', width: '100%', justifyContent: 'center', marginTop:'40px'}}/>
          </form>
        </div>
      </div>
    </>
  );
}
