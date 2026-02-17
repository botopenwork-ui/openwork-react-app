import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json";
import "./VoteProposal.css";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";
import Button from "../../components/Button/Button";

const SKILLITEMS = [
    'UX/UI Design','UX/UI Design','UX/UI Design'
]

export default function VoteProposal() {

  const handleCopyToClipboard = (address) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        alert("Address copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Check if user is already connected to MetaMask
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkWalletConnection();
  }, []);

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  const fetchFromIPFS = async (hash) => {
    try {
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return {};
    }
  };

  return (
    <>
      <div className="newTitle">
         <div className="titleTop">
          <Link className="goBack" to={`/profile-owner-view`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText">UX Skill Oracle Application</div>
          <Link className="goBack" to={`/profile-owner-view`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
         </div>
       </div>

      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="sectionTitle">
            <span id="rel-title">Caste your vote</span>
          </div>
          <div className="release-payment-body payment-history-body">
                <div className="cast-vote-section">
                    <span>You're voting</span>
                    <span style={{color:'#067647'}}>in favour</span>
                    <img src="/favour.svg" alt="" />
                </div>
            <div className="form-groupDC" style={{marginBottom:'16px'}}>
              <textarea
                placeholder="Reason explaining why this person should be recruited"
              ></textarea>
            </div>
            <Button label={'Submit Upvote'} icon='/favour.svg' buttonCss={'downvote-button upvote-button'}/>
          </div>
        </div>
      </div>
    </>
  );
}
