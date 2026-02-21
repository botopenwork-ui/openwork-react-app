import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json";
import "./ProfileAbout.css";
import SkillBox from "../../components/SkillBox/SkillBox";


export default function ProfileAbout() {
    const { jobId } = useParams();
  
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
  
    useEffect(() => {
      async function fetchJobDetails() {
        try {
          const web3 = new Web3("https://erpc.xinfin.network"); // Using the specified RPC endpoint
          const contractAddress = "0x00844673a088cBC4d4B4D0d63a24a175A2e2E637";
          const contract = new web3.eth.Contract(L1ABI, contractAddress);
  
          // Fetch job details
          const jobDetails = await contract.methods.getJobDetails(jobId).call();
          const ipfsHash = jobDetails.jobDetailHash;
          const ipfsData = await fetchFromIPFS(ipfsHash);
  
          // Fetch proposed amount using getApplicationProposedAmount
          const proposedAmountWei = await contract.methods
            .getApplicationProposedAmount(jobId)
            .call();
  
          // Fetch escrow amount using getJobEscrowAmount
          const escrowAmountWei = await contract.methods
            .getJobEscrowAmount(jobId)
            .call();
  
          // Convert amounts from USDC units (6 decimals)
          const proposedAmount = web3.utils.fromWei(proposedAmountWei, "mwei");
          const currentEscrowAmount = web3.utils.fromWei(escrowAmountWei, "mwei");
  
          const amountReleased = proposedAmount - currentEscrowAmount;
  
          setJob({
            jobId,
            employer: jobDetails.employer,
            escrowAmount: currentEscrowAmount,
            isJobOpen: jobDetails.isOpen,
            totalEscrowAmount: proposedAmount,
            amountLocked: currentEscrowAmount,
            amountReleased: amountReleased,
            ...ipfsData,
          });
  
          setLoading(false); // Stop loading animation after fetching data
        } catch (error) {
          console.error("Error fetching job details:", error);
          setLoading(false); // Ensure loading stops even if there is an error
        }
      }
  
      fetchJobDetails();
    }, [jobId]);
  
  
    const fetchFromIPFS = async (hash) => {
      try {
        const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching data from IPFS:", error);
        return {};
      }
    };

    const SKILLITEMS = [
        {
            title: 'UX Design',
            verified: true
        },
        {
            title: 'UI Design',
            verified: false
        },
        {
            title: 'Webflow',
            verified: false
        },
        {
            title: 'React',
            verified: true
        },
        {
            title: '+ 5 more',
            verified: false
        },
    ]

    return (
        <>
            <div className="newTitle">
                <div className="titleTop">
                <Link className="goBack" to={`/profile`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
                <div className="titleText">{formatWalletAddress(walletAddress)}</div>
                </div>
                <div className="titleBottom"><p>  Contract ID:{" "}
                {formatWalletAddress(walletAddress)}
                </p><img src="/copy.svg" className="copyImage" onClick={() =>
                        handleCopyToClipboard(
                        walletAddress
                        )
                    }
                    /></div>
            </div>
            <div className="form-containerDC" style={{marginTop: '0px'}}>
                <div className="form-container-release">
                    <div className="sectionTitle">
                        <span>About</span>
                    </div>
                    <div className="release-payment-body profile-body">
                        <div className="profile-about-item">
                            <span>SKILLS</span>
                            <div className="profile-skill">
                                {SKILLITEMS.map((item, index) => (
                                    <SkillBox key={index} title={item.title} verified={item.verified} />
                                ))}
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>From</span>
                            <div className="profile-about-content">
                                <img src="/AU.svg" alt="" />
                                <span>Melbourne, Australia</span>
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>Languages</span>
                            <div className="profile-about-content">
                                <span>English, Hindi</span>
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>experience</span>
                            <div className="profile-about-content">
                                <span>4 Years</span>
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>hourly rate</span>
                            <div className="profile-about-content">
                                <span>76 / Hr</span>
                                <img src="/xdc.svg" alt="" />
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>email</span>
                            <div className="profile-about-content" style={{color: '#0047ff'}}>
                                <span>hi@jayawillis.com</span>
                                <img src="/view_profile.svg" alt="" />
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>telegram</span>
                            <div className="profile-about-content" style={{color: '#0047ff'}}>
                                <span>—</span>
                                <img src="/view_profile.svg" alt="" />
                            </div>
                        </div>
                        <div className="profile-about-item">
                            <span>phone</span>
                            <div className="profile-about-content" style={{color: '#0047ff'}}>
                                <span>+91 9876493761</span>
                            </div>
                        </div>
                        <div className="profile-description">
                        I'm a Product Designer based in Melbourne, Australia. I enjoy working on product design, design systems, and Webflow projects, but I don't take myself too seriously.
                        I’ve worked with some of the world’s most exciting companies, including Coinbase, Stripe, and Linear. I'm passionate about helping startups grow, improve their UX and customer experience, and to raise venture capital through good design.
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}