import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import GenesisABI from "../../ABIs/genesis_ABI.json";
import NativeAthenaABI from "../../ABIs/native-athena_ABI.json";
import "./AskAthenaApplication.css";
import "../../pages/ReviewDispute/ReviewDispute.css";
import Button from "../../components/Button/Button";
import BlueButton from "../../components/BlueButton/BlueButton";
import VoteBar from "../../components/VoteBar/VoteBar";
import Warning from "../../components/Warning/Warning";
import { formatAddress } from "../../utils/oracleHelpers";
import { getNativeChain, isMainnet } from "../../config/chainConfig";

function getNativeAthenaAddress() {
  const nativeChain = getNativeChain();
  return nativeChain?.contracts?.nativeAthena;
}

function getNativeChainId() {
  return isMainnet() ? 42161 : 421614;
}

function getNativeChainName() {
  return isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia";
}

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

function ATTACHMENTS({title, url}) {
    return (
      <div className="attachment-form" onClick={() => url && window.open(url, '_blank')} style={{ cursor: url ? 'pointer' : 'default' }}>
        <img src="/attachments.svg" alt="" />
        <span>{title}</span>
      </div>
    )
  }

export default function AskAthenaApplication() {
  const { jobId } = useParams();
  const applicationId = jobId;

  const [appData, setAppData] = useState(null);
  const [voters, setVoters] = useState([]);
  const [ipfsData, setIpfsData] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingT, setLoadingT] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");

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

  useEffect(() => {
    if (!applicationId || !walletAddress || !voters.length) return;
    const userVoter = voters.find(v => v.voter.toLowerCase() === walletAddress.toLowerCase());
    if (userVoter) {
      setHasVoted(true);
      setUserVote(userVoter.voteFor);
    }
  }, [applicationId, walletAddress, voters]);

  // Fetch AskAthena application details from Genesis on Arbitrum
  useEffect(() => {
    async function fetchApplicationDetails() {
      if (applicationId === undefined || applicationId === null) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching AskAthena application:", applicationId);

        const nativeChain = getNativeChain();
        if (!nativeChain) {
          console.error("Native chain not configured");
          setLoading(false);
          return;
        }

        const web3 = new Web3(nativeChain.rpcUrl);
        const genesisContract = new web3.eth.Contract(GenesisABI, nativeChain.contracts.genesis);

        const application = await genesisContract.methods.getAskAthenaApplication(applicationId).call();
        const votersData = await genesisContract.methods.getAskAthenaVoters(applicationId).call();

        console.log("AskAthena application data:", application);
        console.log("Voters:", votersData);

        const totalVotes = Number(application.votesFor) + Number(application.votesAgainst);
        const votesForPercent = totalVotes > 0 ? (Number(application.votesFor) / totalVotes) : 0;
        const votesAgainstPercent = totalVotes > 0 ? (Number(application.votesAgainst) / totalVotes) : 0;

        // fees is a STRING in AskAthena
        const feeAmount = application.fees ? (parseInt(application.fees) / 1e6).toFixed(2) : "0.00";

        const nativeAthenaContract = new web3.eth.Contract(NativeAthenaABI, getNativeAthenaAddress());
        const votingPeriodMinutes = Number(await nativeAthenaContract.methods.votingPeriodMinutes().call());

        // Use on-chain block timestamp
        const votingPeriodSeconds = votingPeriodMinutes * 60;
        let now;
        try {
          const blockNum = await web3.eth.getBlockNumber();
          const block = await web3.eth.getBlock(blockNum);
          now = Number(block.timestamp);
        } catch (e) {
          now = Math.floor(Date.now() / 1000);
        }
        const elapsed = now - Number(application.timeStamp);
        const remainingSeconds = votingPeriodSeconds - elapsed;

        let timeLeftDisplay = "Expired";
        if (remainingSeconds > 0) {
          if (remainingSeconds > 86400) {
            const days = Math.floor(remainingSeconds / 86400);
            timeLeftDisplay = `${days} day${days > 1 ? 's' : ''} left`;
          } else if (remainingSeconds > 3600) {
            const hours = Math.floor(remainingSeconds / 3600);
            timeLeftDisplay = `${hours}h left`;
          } else {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timeLeftDisplay = `${minutes}m ${seconds}s left`;
          }
        }

        let status = "Pending";
        if (application.isFinalized) {
          status = application.result ? "Approved" : "Rejected";
        } else if (application.isVotingActive) {
          status = "Voting";
        } else if (remainingSeconds <= 0) {
          status = "Ready to Settle";
        }

        setVoters(votersData);
        setAppData({
          applicationId,
          applicant: application.applicant,
          description: application.description || "",
          applicationHash: application.hash || "",
          targetOracleName: application.targetOracle || "Unknown Oracle",
          feeAmount,
          votesFor: application.votesFor.toString(),
          votesAgainst: application.votesAgainst.toString(),
          totalVotes,
          votesForPercent,
          votesAgainstPercent,
          isVotingActive: application.isVotingActive,
          isFinalized: application.isFinalized,
          result: application.result,
          timeLeft: timeLeftDisplay,
          remainingSeconds,
          status,
          timeStamp: Number(application.timeStamp),
        });

        // Fetch IPFS data from hash field
        if (application.hash && application.hash.length > 0) {
          try {
            const ipfs = await fetchFromIPFS(application.hash);
            setIpfsData(ipfs);
          } catch (e) {
            console.warn("Could not fetch IPFS data:", e);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching AskAthena application details:", error);
        setLoading(false);
      }
    }

    fetchApplicationDetails();
  }, [applicationId]);

  const fetchFromIPFS = async (hash) => {
    try {
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return {};
    }
  };

  // Handle vote - votingType = 2 for AskAthena
  const handleVote = async (voteFor) => {
    setSuccessMessage("");
    setErrorMessage("");
    setTxHash("");

    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (!appData.isVotingActive) {
      setErrorMessage("Voting period has ended. You can no longer vote on this inquiry.");
      return;
    }

    if (appData.isFinalized) {
      setErrorMessage("Inquiry has already been settled");
      return;
    }

    try {
      setLoadingT("Submitting your vote...");

      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const chainId = await web3.eth.getChainId();
      const expectedChainId = getNativeChainId();
      const chainName = getNativeChainName();

      if (Number(chainId) !== expectedChainId) {
        setErrorMessage(`Please switch to ${chainName} network. Current Chain ID: ${chainId}, Required: ${expectedChainId}`);
        setLoadingT("");
        return;
      }

      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      const nativeAthenaAddress = getNativeAthenaAddress();
      const nativeAthena = new web3.eth.Contract(NativeAthenaABI, nativeAthenaAddress);

      console.log("Vote parameters:", {
        contract: nativeAthenaAddress,
        votingType: 2,
        applicationId: applicationId,
        voteFor: voteFor,
        claimAddress: fromAddress
      });

      return new Promise((resolve, reject) => {
        nativeAthena.methods
          .vote(
            2,                          // uint8 _votingType (2 = AskAthena)
            String(applicationId),
            Boolean(voteFor),
            fromAddress
          )
          .send({ from: fromAddress })
          .on('transactionHash', (hash) => {
            console.log("Vote transaction sent! Hash:", hash);
            setTxHash(hash);
          })
          .on('receipt', (receipt) => {
            setLoadingT("");
            if (receipt.status == 1 || receipt.status == "1") {
              setSuccessMessage(`Vote submitted successfully! You voted ${voteFor ? 'FOR' : 'AGAINST'} the inquiry.`);
              setTimeout(() => window.location.reload(), 2000);
              resolve(receipt);
            } else {
              setErrorMessage("Transaction reverted by the blockchain");
              reject(new Error("Transaction reverted"));
            }
          })
          .on('error', (error) => {
            console.error("Vote transaction error:", error);
            setLoadingT("");
            const errorMsg = error.message || "";
            if (errorMsg.includes("user rejected")) {
              setErrorMessage("Transaction was rejected in MetaMask");
            } else if (errorMsg.includes("Already voted")) {
              setErrorMessage("You have already voted on this inquiry");
            } else if (errorMsg.includes("Insufficient stake")) {
              setErrorMessage("You need at least 100 OW tokens (staked or earned) to vote");
            } else if (errorMsg.includes("Voting period has expired")) {
              setErrorMessage("Voting period has ended");
            } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("rate limited")) {
              setErrorMessage("Network error. Your vote may have been submitted - please refresh to check.");
            } else {
              setErrorMessage("Vote failed: " + errorMsg.substring(0, 100));
            }
            reject(error);
          });
      });

    } catch (error) {
      console.error("Error in handleVote:", error);
      setLoadingT("");
      setErrorMessage("Failed to submit vote: " + (error.message || "Unknown error"));
    }
  };

  // Handle settle AskAthena
  const handleSettle = async () => {
    setSuccessMessage("");
    setErrorMessage("");
    setTxHash("");

    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (appData.isFinalized) {
      setErrorMessage("Inquiry has already been settled");
      return;
    }

    try {
      setLoadingT("Checking settlement conditions...");

      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const chainId = await web3.eth.getChainId();
      const expectedChainId = getNativeChainId();
      const chainName = getNativeChainName();

      if (Number(chainId) !== expectedChainId) {
        setErrorMessage(`Please switch to ${chainName} network. Current Chain ID: ${chainId}, Required: ${expectedChainId}`);
        setLoadingT("");
        return;
      }

      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      const nativeAthenaAddress = getNativeAthenaAddress();
      const nativeAthena = new web3.eth.Contract(NativeAthenaABI, nativeAthenaAddress);

      // Pre-flight simulation
      try {
        await nativeAthena.methods
          .settleAskAthena(Number(applicationId))
          .call({ from: fromAddress });
      } catch (simError) {
        setLoadingT("");
        const simMsg = simError.message || simError.toString();
        console.error("Settle simulation failed:", simMsg);

        if (simMsg.includes("No app")) {
          setErrorMessage("Inquiry does not exist on-chain.");
        } else if (simMsg.includes("Finalized")) {
          setErrorMessage("Inquiry has already been settled.");
          setTimeout(() => window.location.reload(), 2000);
        } else if (simMsg.includes("!Active")) {
          setErrorMessage("Voting is not active for this inquiry. The cross-chain submission may still be syncing.");
        } else if (simMsg.includes("Wait")) {
          try {
            const nativeChain = getNativeChain();
            const readWeb3 = new Web3(nativeChain.rpcUrl);
            const readGenesis = new readWeb3.eth.Contract(GenesisABI, nativeChain.contracts.genesis);
            const readAthena = new readWeb3.eth.Contract(NativeAthenaABI, nativeChain.contracts.nativeAthena);
            const app = await readGenesis.methods.getAskAthenaApplication(applicationId).call();
            const period = Number(await readAthena.methods.votingPeriodMinutes().call());
            const blockNum = await readWeb3.eth.getBlockNumber();
            const block = await readWeb3.eth.getBlock(blockNum);
            const blockTime = Number(block.timestamp);
            const endTime = Number(app.timeStamp) + (period * 60);
            const remaining = endTime - blockTime;
            if (remaining > 0) {
              const mins = Math.floor(remaining / 60);
              const secs = remaining % 60;
              setErrorMessage(`Voting period has not ended yet on-chain. ${mins}m ${secs}s remaining (based on block timestamp).`);
            } else {
              setErrorMessage("Contract reports voting period not ended, but on-chain time shows it should be. Try again in a moment.");
            }
          } catch (e) {
            setErrorMessage("Voting period has not ended yet on-chain. Please wait and try again.");
          }
        } else {
          setErrorMessage("Transaction will fail: " + simMsg.substring(0, 150));
        }
        return;
      }

      // Simulation passed
      setLoadingT("Settling Ask Athena inquiry...");

      await new Promise((resolve, reject) => {
        nativeAthena.methods
          .settleAskAthena(Number(applicationId))
          .send({ from: fromAddress })
          .on('transactionHash', (hash) => {
            console.log("Settle transaction sent! Hash:", hash);
            setTxHash(hash);
            setLoadingT("Transaction submitted - waiting for confirmation...");
          })
          .on('receipt', (receipt) => {
            setLoadingT("");
            if (receipt.status == 1 || receipt.status == "1") {
              setSuccessMessage("Ask Athena inquiry settled successfully!");
              setTimeout(() => window.location.reload(), 2000);
              resolve(receipt);
            } else {
              setErrorMessage("Transaction reverted by the blockchain");
              reject(new Error("Transaction reverted"));
            }
          })
          .on('error', (error) => {
            console.error("Settle transaction error:", error);
            setLoadingT("");
            const errorMsg = error.message || "";
            if (errorMsg.includes("user rejected")) {
              setErrorMessage("Transaction was rejected in MetaMask");
            } else if (errorMsg.includes("insufficient funds")) {
              setErrorMessage("Insufficient ETH for gas fees");
            } else {
              setErrorMessage("Settlement failed: " + errorMsg.substring(0, 100));
            }
            reject(error);
          });
      });

    } catch (error) {
      console.error("Error in handleSettle:", error);
      setLoadingT("");
      setErrorMessage("Failed to settle: " + (error.message || "Unknown error"));
    }
  };

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon"><img src="/OWIcon.svg" alt="Loading..."/></div>
        <div className="loading-message">
          <h1 id="txText">{loadingT}</h1>
          <p id="txSubtext">Please confirm the transaction in MetaMask and wait for blockchain confirmation</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }

  if (!appData) {
    return <div>Inquiry not found</div>;
  }

  const submissionDate = appData.timeStamp > 0
    ? new Date(appData.timeStamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : "Unknown";

  return (
    <>
      <div className="newTitle">
         <div className="titleTop">
          <Link className="goBack" to="/ask-athena-applications"><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>
          <div className="titleText" style={{fontWeight:'550'}}>Ask Athena #{applicationId}</div>
          <Link className="goBack" to="/ask-athena-applications" style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>
         </div>
         <div className="titleBottom">
          <a href={`/profile/${appData.applicant}`} className="view-profile">
                <span>View Applicant Profile</span>
                <img src="/view_profile.svg" alt="" />
            </a>
         </div>
       </div>

      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="sectionTitle reviewTitle">
            <span id="rel-title" style={{paddingTop:'0px'}}>Inquiry Details</span>
            <span className="left-days">{appData.timeLeft}</span>
          </div>
          <div className="release-payment-body">
            {successMessage && (
              <div style={{
                background: '#f0fdf4',
                border: '2px solid #86efac',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#166534', fontWeight: 600 }}>
                  {successMessage}
                </p>
                {txHash && (
                  <a
                    href={isMainnet() ? `https://arbiscan.io/tx/${txHash}` : `https://sepolia.arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#0047FF', textDecoration: 'underline' }}
                  >
                    View transaction on Arbiscan
                  </a>
                )}
              </div>
            )}

            {errorMessage && (
              <div style={{
                background: '#fef2f2',
                border: '2px solid #fca5a5',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: 600 }}>
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="form-groupDC">
                <div className="detail-row">
                    <span className="detail-label">ASKED BY</span>
                    <div className="detail-profile">
                    <span className="detail-value-address">
                        <img src="/user.png" alt="Applicant" className="Job" />
                        <p title={appData.applicant}>{formatAddress(appData.applicant)}</p>
                    </span>
                    <a href={`/profile/${appData.applicant}`} className="view-profile">
                        <span>View Profile</span>
                        <img src="/view_profile.svg" alt="" />
                    </a>
                    </div>
                </div>
            </div>
            <div className="profile-about-item">
                <span>TARGET ORACLE</span>
                <div className="profile-about-content">
                    <span>{appData.targetOracleName}</span>
                </div>
            </div>
            {appData.description && (
              <div className="profile-about-item">
                  <span>QUESTION</span>
                  <div className="profile-about-content">
                      <span>{appData.description}</span>
                  </div>
              </div>
            )}
            {ipfsData && ipfsData.description && (
              <div>
                  <div className="apply-introduction">
                      <span>{ipfsData.description}</span>
                  </div>
              </div>
            )}
            {ipfsData && ipfsData.files && ipfsData.files.length > 0 && (
              <div>
                  <div className="category">
                      <span>ATTACHMENTS</span>
                      {ipfsData.files.map((file, index) => (
                        <div className="upload-content" key={index}>
                          <ATTACHMENTS
                            title={file.name || file.fileName || `Attachment ${index + 1}`}
                            url={file.ipfsHash ? `https://gateway.lighthouse.storage/ipfs/${file.ipfsHash}` : null}
                          />
                        </div>
                      ))}
                  </div>
              </div>
            )}
            {appData.applicationHash && (
              <div className="form-groupDC">
                  <div className="detail-row">
                      <span className="detail-label">EVIDENCE HASH</span>
                      <div className="detail-value description-value">
                          <p style={{ wordBreak: 'break-all' }}>{appData.applicationHash}</p>
                      </div>
                  </div>
              </div>
            )}
            <div className="form-groupDC job-body">
              <div className="job-detail-sectionR">
                <JobdetailItem title="INQUIRY FEE" amount={appData.feeAmount}/>
                <JobdetailItem title="TOTAL VOTERS" amount={voters.length}/>
                <JobdetailItem title="SUBMITTED" amount={submissionDate}/>
              </div>
            </div>
            <div className="form-groupDC token-section">
               <div className="job-detail-sectionR" style={{width:'100%'}}>
                    <JobdetailItem title="TOKENS IN FAVOUR" amount={Web3.utils.fromWei(appData.votesFor || '0', 'ether').slice(0, 8)} token={true}/>
               </div>
               <div className="job-detail-sectionR" style={{width:'100%'}}>
                    <JobdetailItem title="TOKENS AGAINST" amount={Web3.utils.fromWei(appData.votesAgainst || '0', 'ether').slice(0, 8)} token={true}/>
               </div>
            </div>
            <div className="form-groupDC" style={{marginTop:'53px'}}>
                <VoteBar
                    totalVotes={1}
                    votesInFavor={appData.votesForPercent}
                    votesAgainst={appData.votesAgainstPercent}
                    threshold={0.5}
                />
            </div>
            <div className="form-groupDC">
               <div className="job-detail-sectionR vote-conditions">
                    <div className="vote-conditions-header">
                    VOTING STATUS
                    </div>
                    <div className="vote-conditions-content">
                        <span>-</span>
                        <span>Status: {appData.status}</span>
                    </div>
                    <div className="vote-conditions-content">
                        <span>-</span>
                        <span>Total Voters: {voters.length}</span>
                    </div>
                    {appData.isFinalized && (
                      <div className="vote-conditions-content">
                          <span>-</span>
                          <span>Result: {appData.result ? 'Approved' : 'Rejected'}</span>
                      </div>
                    )}
               </div>
            </div>
            <div className="form-groupDC">
               <div className="job-detail-sectionR">
                    <JobdetailItem title="RESOLUTION COMPENSATION" icon={true} amount={appData.feeAmount}/>
               </div>
            </div>
            {appData.remainingSeconds > 0 && !appData.isFinalized && appData.isVotingActive && (
              <div className="form-groupDC">
                 <div className="vote-button-section">
                      <Button
                        label={'Downvote'}
                        icon='/against.svg'
                        buttonCss={'downvote-button'}
                        onClick={() => handleVote(false)}
                      />
                      <Button
                        label={'Upvote'}
                        icon='/favour.svg'
                        buttonCss={'downvote-button upvote-button'}
                        onClick={() => handleVote(true)}
                      />
                 </div>
                 {hasVoted && walletAddress && (
                   <div className="warning-form" style={{ marginTop: '16px' }}>
                     <Warning content={`You already voted ${userVote ? 'FOR' : 'AGAINST'} this inquiry`} />
                   </div>
                 )}
              </div>
            )}

            {appData.remainingSeconds <= 0 && !appData.isFinalized && appData.isVotingActive && (
              <div className="form-groupDC">
                 <div className="settle-button-container">
                   <BlueButton
                     label={'Settle Inquiry'}
                     style={{
                       width: '100%',
                       justifyContent:'center',
                       padding: '8px 16px',
                       borderRadius: '12px'
                     }}
                     onClick={handleSettle}
                   />
                 </div>
                 <div className="warning-form" style={{ marginTop: '16px' }}>
                   <Warning content="Voting period has ended. Anyone can now settle this Ask Athena inquiry." />
                 </div>
              </div>
            )}

            {!appData.isVotingActive && !appData.isFinalized && (
              <div className="form-groupDC">
                 <div style={{
                   background: '#fffbeb',
                   border: '1px solid #fcd34d',
                   padding: '16px',
                   borderRadius: '8px',
                   textAlign: 'center'
                 }}>
                   <p style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: 600 }}>
                     Voting is not active for this inquiry. The cross-chain submission may still be syncing.
                   </p>
                 </div>
              </div>
            )}

            {appData.isFinalized && (
              <div className="form-groupDC">
                 <div style={{
                   background: appData.result ? '#f0fdf4' : '#fef2f2',
                   border: `1px solid ${appData.result ? '#86efac' : '#fca5a5'}`,
                   padding: '16px',
                   borderRadius: '8px',
                   textAlign: 'center'
                 }}>
                   <p style={{ margin: 0, fontSize: '14px', color: appData.result ? '#166534' : '#991b1b', fontWeight: 600 }}>
                     {appData.result
                       ? 'Ask Athena inquiry approved by the oracle.'
                       : 'Ask Athena inquiry rejected by the oracle.'}
                   </p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
