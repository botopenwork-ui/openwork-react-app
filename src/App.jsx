import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Routes, Route, Link, BrowserRouter } from "react-router-dom";
import "./App.css";
import { Layout } from "./components/Layout/layout";
import DirectContractForm from "./pages/DirectContractForm/DirectContractForm";
import ViewJobs from "./pages/ViewJobs/ViewJobs";
import SingleJobDetails from "./pages/SingleJobDetails/SingleJobDetails";
import JobDeepView from "./pages/JobDeepView/JobDeepView";
import ReleasePayment from "./pages/ReleasePayment/ReleasePayment";
import JobUpdate from "./pages/JobUpdate/JobUpdate";
import AddUpdate from "./pages/AddUpdate/AddUpdate";
import MenuItem from "./components/MenuItem";

// Importing custom hooks and utility functions to modularize the logic for better separation of concerns
import { useWalletConnection } from "./functions/useWalletConnection"; // Manages wallet connection logic
import { useDropdown } from "./functions/useDropdown"; // Manages dropdown visibility and toggling
import { useHoverEffect } from "./functions/useHoverEffect"; // Manages hover states for radial buttons
import { useMobileDetection } from "./functions/useMobileDetection"; // Detects if the user is on a mobile device
import { formatWalletAddress } from "./functions/formatWalletAddress"; // Utility function to format wallet address
import { useButtonHover } from "./functions/useButtonHover"; // Custom hook for handling button hover events
import Work from "./pages/Work/Work";
import Notification from "./pages/Notification/Notification";
import Governance from "./pages/Governance/Governance";
import BrowseJobs from "./pages/BrowseJobs/BrowseJobs";
import BrowseTalent from "./pages/BrowseTalent/BrowseTalent";
import PostJob from "./pages/PostJob/PostJob";
import ConnectWallet from "./components/ConnectWallet/ConnectWallet";
import ProjectComplete from "./pages/ProjectComplete/ProjectComplete";
import ViewWork from "./pages/ViewWork/ViewWork";
import RaiseDispute from "./pages/RaiseDispute/RaiseDispute";
import TakerJobDetails from "./pages/TakerJobDetails/TakerJobDetails";
import About from "./pages/About/About";
import Profile from "./pages/Profile/Profile";
import ProfileAbout from "./pages/ProfileAbout/ProfileAbout";
import ProfileJobs from "./pages/ProfileJobs/ProfileJobs";
import ApplicationJobs from "./pages/ApplicationJobs/ApplicationJobs";
import ProfilePortfolio from "./pages/ProfilePortfolio/ProfilePortfolio";
import ProfilePortfolioOwner from "./pages/ProfilePortfolioOwner/ProfilePortfolioOwner";
import ProfilePortfolioWrapper from "./pages/ProfilePortfolioWrapper/ProfilePortfolioWrapper";
import ViewWorkProfile from "./pages/ViewWorkProfile/ViewWorkProfile";
import AddEditPortfolio from "./pages/AddEditPortfolio/AddEditPortfolio";
import ProfilePackages from "./pages/ProfilePackages/ProfilePackages";
import ViewPackage from "./pages/ViewPackage/ViewPackage";
import CreatePackage from "./pages/CreatePackage/CreatePackage";
import EditPicture from "./pages/EditPicture/EditPicture";
import Payments from "./pages/Payments/Payments";
import PaymentHistory from "./pages/PaymentHistory/PaymentHistory";
import PaymentRefund from "./pages/PaymentRefund/PaymentRefund";
import ProfileOwnerView from "./pages/ProfileOwnerView/ProfileOwnerView";
import GetSkillsVerified from "./pages/GetSkillsVerified/GetSkillsVerified";
import ApplyNow from "./pages/ApplyNow/ApplyNow";
import JoinNow from "./pages/JoinNow/JoinNow";
import SkillOracle from "./pages/SkillOracle/SkillOracle";
import MembersSkillOracle from "./pages/MembersSkillOracle/MembersSkillOracle";
import SkillOracleProposals from "./pages/SkillOracleProposals/SkillOracleProposals";
import SkillOracleDisputes from "./pages/SkillOracleDisputes/SkillOracleDisputes";
import DAOMembers from "./pages/DAOMembers/DAOMembers";
import MembersGovernance from "./pages/MembersGovernance/MembersGovernance";
import RemoveMember from "./pages/RemoveMember/RemoveMember";
import VotingHistory from "./pages/VotingHistory/VotingHistory";
import AddMember from "./pages/AddMember/AddMember";
import ReviewDispute from "./pages/ReviewDispute/ReviewDispute";
import JoineeApplication from "./pages/JoineeApplication/JoineeApplication";
import RemovalApplication from "./pages/RemovalApplication/RemovalApplication";
import RecruitmentApplication from "./pages/RecruitmentApplication/RecruitmentApplication";
import SkillVerificationApplication from "./pages/SkillVerificationApplication/SkillVerificationApplication";
import VoteProposal from "./pages/VoteProposal/VoteProposal";
import VoteSubmission from "./pages/VoteSubmission/VoteSubmission";
import ApplyJob from "./pages/ApplyJob/ApplyJob";
import ViewReceivedApplication from "./pages/ViewReceivedApplication/ViewReceivedApplication";
import ViewAnyApplication from "./pages/ViewAnyApplication/ViewAnyApplication";
import ViewJobDetails from "./pages/ViewJobDetails/ViewJobDetails";
import ViewJobApplications from "./pages/ViewJobApplications/ViewJobApplications";
import ExistingMemberSkillOracle from "./pages/ExistingMemberSkillOracle/ExistingMemberSkillOracle";
import DAO from "./pages/DAO/DAO";
import JoinDAO from "./pages/JoinDAO/JoinDAO";
import Newproposel from "./pages/Newproposel/Newproposel";
import TreasuryProposal from "./pages/TreasuryProposal/TreasuryProposal";
import ContractUpgradeProposal from "./pages/ContractUpgradeProposal/ContractUpgradeProposal";
import ContractUpgradeProposalStep2 from "./pages/ContractUpgradeProposalStep2/ContractUpgradeProposalStep2";
import SkillOracleProposal from "./pages/SkillOracleProposal/SkillOracleProposal";
import SkillOracleMemberProposal from "./pages/SkillOracleMemberProposal/SkillOracleMemberProposal";
import ContractUpdateProposel from "./pages/ContractUpdateProposel/ContractUpdateProposel";
import ContractUpdateProposelStep2 from "./pages/ContractUpdateProposelStep2/ContractUpdateProposelStep2";
import ContractUpdateProposelStep3 from "./pages/ContractUpdateProposelStep3/ContractUpdateProposelStep3";
import OpenWorkJobProposel from "./pages/OpenWorkJobProposel/OpenWorkJobProposel";
import NewSkillOracleStep2 from "./pages/NewSkillOracleStep2/NewSkillOracleStep2";
import DissolveSkillOracleStep2 from "./pages/DissolveSkillOracleStep2/DissolveSkillOracleStep2";
import SkillOracleRecruitmentStep2 from "./pages/SkillOracleRecruitmentStep2/SkillOracleRecruitmentStep2";
import SkillOracleMemberRemovalStep2 from "./pages/SkillOracleMemberRemovalStep2/SkillOracleMemberRemovalStep2";
import ContractUpdateProposalView from "./pages/ContractUpdateProposalView/ContractUpdateProposalView";
import ContractUpgradeProposalView from "./pages/ContractUpgradeProposalView/ContractUpgradeProposalView";
import TreasuryProposalView from "./pages/TreasuryProposalView/TreasuryProposalView";
import DissolveOracleProposalView from "./pages/DissolveOracleProposalView/DissolveOracleProposalView";
import RecruitmentProposalView from "./pages/RecruitmentProposalView/RecruitmentProposalView";
import GenericProposalView from "./pages/GenericProposalView/GenericProposalView";
import ChainSwitching from "./pages/ChainSwitching/ChainSwitching";
import ReferralNotEligible from "./pages/ReferralNotEligible/ReferralNotEligible";
import ReferralEligible from "./pages/ReferralEligible/ReferralEligible";
import ReferEarnNotEligible from "./pages/ReferEarnNotEligible/ReferEarnNotEligible";
import ReferEarn from "./pages/ReferEarn/ReferEarn";
import UserReferralSignIn from "./pages/UserReferralSignIn/UserReferralSignIn";
import SkillVerification from "./pages/SkillVerification/SkillVerification";
import LandingPage from "./pages/LandingPage/LandingPage";
import Timeline from "./dev-tools/Timeline/Timeline";
import OpenworkDocs from "./pages/Documentation/OpenworkDocs";

function MainPage() {
  // Using the useWalletConnection hook to handle wallet-related state and logic
  const { walletAddress, connectWallet, disconnectWallet } =
    useWalletConnection();

  // Using the useDropdown hook to manage dropdown visibility state
  const { dropdownVisible, toggleDropdown } = useDropdown();

  // Using the useHoverEffect hook to manage the button hover effects
  const {
    hovering,
    setHovering,
    buttonsVisible,
    setButtonsVisible,
    buttonFlex,
  } = useHoverEffect();

  // Detects if the user is on a mobile device
  const isMobile = useMobileDetection();

  // State to track if the core element is being hovered over
  const [coreHovered, setCoreHovered] = useState(false);

  // Hook from react-router-dom to handle navigation between pages
  const navigate = useNavigate();

  // Initializing hover effect logic for buttons using a custom hook
  useButtonHover();

  // Function to handle navigation to the whitepaper when selected in the dropdown menu
  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  return (
    <main className="container-home">
      {/* Conditional rendering of the mobile warning if the user is on a mobile device */}
      {isMobile && (
        <div
          className="mobile-warning"
          style={{
            height: "1000px",
            width: "100%",
            fontFamily: "Satoshi",
            fontSize: "25px",
          }}
        >
          {/* Header section for the mobile warning */}
          <div
            style={{
              height: "64px",
              width: "100%",
              borderBottom: "2px solid whitesmoke",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              style={{ height: "25px", width: "180px" }}
              src="/Logo.jpg"
              alt="Openwork Logo"
              id="logo-home"
            />
          </div>
          <div id="warning-body">
            <img
              style={{ height: "80px", width: "80px" }}
              src="/screen.svg"
              alt="Openwork Logo"
              id="logo-home"
            />
            <h1 id="mobile-heading">Desktop Only Feature</h1>
            <p id="mobile-sub">
              This feature is currently not supported on mobile devices
            </p>
          </div>
        </div>
      )}

      {/* Radial menu section */}
      <div className="theCircle-home">
        <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow-home" />

        {/* Core element with hover effects */}
        <div
          id="core-home"
          onMouseEnter={() => {
            setButtonsVisible(true);
            setCoreHovered(true);
          }}
          onMouseLeave={() => {
            setButtonsVisible(false);
            setCoreHovered(false);
          }}
        >
          <img src="/core.svg" alt="The Core" className="core-image" />
          <img
            src="/core-hovered2.svg"
            alt="The Core Hovered"
            className="core-image core-hovered-image"
          />
        </div>

        {/* Left button with hover functionality */}
        <MenuItem
          to="/work"
          id="buttonLeft-home"
          buttonsVisible={buttonsVisible}
          buttonFlex={buttonFlex}
          onMouseEnter={() => setButtonsVisible(true)} // Show buttons on hover
          onMouseLeave={() => setButtonsVisible(false)} // Hide buttons on hover out
          imgSrc="/radial-button.svg"
          iconSrc="/work.svg"
          text="Work"
        />


        {/* Right button with hover functionality */}
        <MenuItem
          to="/governance"
          id="buttonRight-home"
          buttonsVisible={buttonsVisible}
          buttonFlex={buttonFlex}
          onMouseEnter={() => setButtonsVisible(true)}
          onMouseLeave={() => setButtonsVisible(false)}
          imgSrc='/radial-button.svg'
          iconSrc='/governance.svg'
          text='Governance' 
        />

        {/* Hover text prompting user to hover over the radial menu */}
        <div
          id="hoverText-home"
          style={{ display: buttonFlex ? "none" : "flex" }}
        >
          Hover to get started
        </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page without Layout (no header/chain selector) */}
        <Route path="/landing" element={<LandingPage />} />
        
        {/* All other routes with Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/home" element={<MainPage />} />
              <Route path="/notifications" element={<Notification/>} />
              <Route path="connect-wallet" element={<ConnectWallet/>} />
              <Route path="/work" element={<Work />} />
              <Route path="/governance" element={<Governance/>}/>
              <Route path="/browse-jobs" element={<BrowseJobs/>}/>
              <Route path="/browse-talent" element={<BrowseTalent/>}/>
              <Route path="/direct-contract" element={<DirectContractForm />} />
              <Route path="/post-job" element={<PostJob/>}/>
              <Route path="/view-jobs" element={<ViewJobs />} />
              <Route path="view-work/:jobId" element={<ViewWork/>}/>
              <Route path="/job-details/:jobId" element={<SingleJobDetails />} />
              <Route path="/job-deep-view/:jobId" element={<JobDeepView />} />
              <Route path="/release-payment/:jobId" element={<ReleasePayment />} />{" "}
              <Route path="/project-complete" element = {<ProjectComplete/>}/>
              <Route path="/job-update/:jobId" element={<JobUpdate />} />
              <Route path="/add-update/:jobId" element={<AddUpdate />} />
              <Route path="/raise-dispute/:jobId" element={<RaiseDispute/>}/>
              <Route path="/job-taker-details/:jobId" element={<TakerJobDetails/>}/>
              <Route path="/about" element={<About/>}/>
              <Route path="/profile" element={<Profile/>}/>
              <Route path="/profile/:address" element={<ProfileOwnerView/>}/>
              <Route path="/profile-about" element={<ProfileAbout/>}/>
              <Route path="/profile-jobs" element={<ProfileJobs/>}/>
              <Route path="/profile/:address/jobs" element={<ProfileJobs/>}/>
              <Route path="/application-jobs" element={<ApplicationJobs/>}/>
              <Route path="/profile-portfolio" element={<ProfilePortfolioWrapper/>}/>
              <Route path="/profile-portfolio-owner" element={<ProfilePortfolioOwner/>}/>
              <Route path="/view-work-profile/:id" element={<ViewWorkProfile/>}/>
              <Route path="/add-portfolio" element={<AddEditPortfolio/>}/>
              <Route path="/edit-portfolio/:id" element={<AddEditPortfolio/>}/>
              <Route path="/profile-packages" element={<ProfilePackages/>}/>
              <Route path="/view-package/:packageId" element={<ViewPackage/>}/>
              <Route path="/create-package" element={<CreatePackage/>}/>
              <Route path="/edit-picture" element={<EditPicture/>}/>
              <Route path="/payments/:jobId" element={<Payments/>} />
              <Route path="/payment-history/:jobId" element={<PaymentHistory/>} />
              <Route path="/payment-refund/:jobId" element={<PaymentRefund/>} />
              <Route path="/skill-verification/:jobId" element={<GetSkillsVerified/>}/>
              <Route path="/skill-oracles" element={<SkillOracle/>} />
              <Route path="/members-skill-oracles" element={<MembersSkillOracle/>} />
              <Route path="/skill-oracle-proposals" element={<SkillOracleProposals/>} />
              <Route path="/skill-oracle-disputes" element={<SkillOracleDisputes/>} />
              <Route path="/dao-members" element={<DAOMembers/>} />
              <Route path="/members-governance/:jobId" element={<MembersGovernance/>} />
              <Route path="/remove-member/:jobId" element={<RemoveMember/>} />
              <Route path="/apply-now" element={<ApplyNow/>}/>
              <Route path="/join-now" element={<JoinNow/>}/>
              <Route path="/voting-history/:jobId" element={<VotingHistory/>} />
              <Route path="/add-member" element={<AddMember/>} />
              <Route path="/review-dispute/:jobId" element={<ReviewDispute/>} />
              <Route path="/dispute-view/:disputeId" element={<ReviewDispute/>} />
              <Route path="/joinee-application/:jobId" element={<JoineeApplication/>} />
              <Route path="/removal-application/:jobId" element={<RemovalApplication/>} />
              <Route path="/recruitment-application/:jobId" element={<RecruitmentApplication/>} />
              <Route path="/skill-verification-application/:jobId" element={<SkillVerificationApplication/>} />
              <Route path="/vote-proposal" element={<VoteProposal/>} />
              <Route path="/vote-submission" element={<VoteSubmission/>} />
              <Route path="/apply-job" element={<ApplyJob/>} />
              <Route path="/view-received-application" element={<ViewReceivedApplication/>} />
              <Route path="/view-any-application" element={<ViewAnyApplication/>}/>
              <Route path="/view-job-details/:jobId" element={<ViewJobDetails/>} />
              <Route path="/view-job-applications/:jobId" element={<ViewJobApplications/>} />
              <Route path="/existing-skill-oracles" element={<ExistingMemberSkillOracle/>} />
              <Route path="/dao" element={<DAO/>} />
              <Route path="/join-dao" element={<JoinDAO/>} />
              <Route path="/new-proposal" element={<Newproposel/>} />
              <Route path="/treasury-proposal" element={<TreasuryProposal/>} />
              <Route path="/contract-upgrade-proposal" element={<ContractUpgradeProposal/>} />
              <Route path="/contract-upgrade-proposal-step2" element={<ContractUpgradeProposalStep2/>} />
              <Route path="/skill-oracle-proposal" element={<SkillOracleProposal/>} />
              <Route path="/skill-oracle-member-proposal" element={<SkillOracleMemberProposal/>} />
              <Route path="/contractupdateproposel" element={<ContractUpdateProposel/>} />
              <Route path="/contract-update-step2" element={<ContractUpdateProposelStep2/>} />
              <Route path="/contractupdateproposelstep3" element={<ContractUpdateProposelStep3/>} />
              <Route path="/dao-votes-update-form" element={<ContractUpdateProposelStep3/>} />
              <Route path="/dao-staking-update-form" element={<ContractUpdateProposelStep3/>} />
              <Route path="/openworkjobproposel" element={<OpenWorkJobProposel/>} />
              <Route path="/newskilloraclestep2" element={<NewSkillOracleStep2/>} />
              <Route path="/dissolveskilloraclestep2" element={<DissolveSkillOracleStep2/>} />
              <Route path="/skilloraclerecruitmentstep2" element={<SkillOracleRecruitmentStep2/>} />
              <Route path="/skilloraclememberremovalstep2" element={<SkillOracleMemberRemovalStep2/>} />
              <Route path="/contract-update-proposal-view" element={<ContractUpdateProposalView/>} />
              <Route path="/contract-upgrade-proposal-view" element={<ContractUpgradeProposalView/>} />
              <Route path="/proposal-view/:proposalId/:chain" element={<GenericProposalView/>} />
              <Route path="/treasury-proposal-view/:proposalId/:chain" element={<TreasuryProposalView/>} />
              <Route path="/dissolve-oracle-proposal-view" element={<DissolveOracleProposalView/>} />
              <Route path="/recruitment-proposal-view" element={<RecruitmentProposalView/>} />
              <Route path="/chain-switching" element={<ChainSwitching/>} />
              <Route path="/referral-not-eligible" element={<ReferralNotEligible/>} />
              <Route path="/referral-eligible" element={<ReferralEligible/>} />
              <Route path="/refer-earn-not-eligible" element={<ReferEarnNotEligible/>} />
              <Route path="/refer-earn" element={<ReferEarn/>} />
              <Route path="/user-referral-signin" element={<UserReferralSignIn/>} />
              <Route path="/skill-verification-page" element={<SkillVerification/>} />
              <Route path="/dev/timeline" element={<Timeline/>} />
              <Route path="/docs" element={<OpenworkDocs/>} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
