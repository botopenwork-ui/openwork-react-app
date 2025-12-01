export const timelineData = {
  webApp: {
    title: "Web App UI + Backend Completion Checklist",
    tasks: [
      {
        name: "Connect Portfolio",
        description: "Check if a person has a profile and let them add a portfolio item and view the added portfolio items. Krishna has sent the pages so connect them now",
        date: "2 Dec"
      },
      {
        name: "Referal System",
        description: "If a new user comes through a referral link, populate the referrer field with the appropriate referrer",
        date: "3 Dec"
      },
      {
        name: "Vote on Disputes",
        description: "Add the web3 call to facilitate Oracle members to vote on a dispute.",
        date: "4 Dec"
      },
      {
        name: "Resolve Disputes",
        description: "Once the voting period is done and there are enough votes, add the web3 call to resolve dispute.",
        date: "4 Dec"
      },
      {
        name: "Notification",
        description: "Get approval to leave this out",
        date: ""
      },
      {
        name: "Packages",
        description: "Remove it, already approved",
        date: "4 Dec"
      },
      {
        name: "Profile -> Work Page",
        description: "When users clicks on Work in his Profile page, they should see jobs the connected wallet in involved in.",
        date: "5 Dec"
      },
      {
        name: "About Page",
        description: "Final touches and remove the button to Buy Tokens",
        date: "5 Dec"
      },
      {
        name: "DAO & Skill Oracle Page",
        description: "Right now dummy data is being loaded till the blockchain data is fetched, correct this to show no data till actual data is fetched.",
        date: "6 Dec"
      },
      {
        name: "Table Columns Functionality",
        description: "For some reason the dropdown is not showing, correct that, because this functionality was already working in the past. Also need to ensure this functionality is a active for all tables",
        date: "7 Dec"
      },
      {
        name: "Search Functionality",
        description: "Get approval to leave this out",
        date: ""
      },
      {
        name: "Skill Oracle Proposals View",
        description: "Either remove it or fetch the Skill Oracle related proposal",
        date: "7 Dec"
      },
      {
        name: "Design Audit & Perfection",
        description: "Ensuring the correctness of all pages in terms of the styles and design and sizes matching with the Figma Design",
        date: "10 Dec"
      }
    ]
  },
  landingPage: {
    title: "Landing Page Completion Checklist",
    tasks: [
      {
        name: "Curve Animation",
        description: "Follow the loom video",
        date: "4 Dec"
      },
      {
        name: "Final Audit & Corrections",
        description: "",
        date: "7 Dec"
      }
    ]
  },
  contract: {
    title: "Contract Completion Checklist",
    tasks: [
      {
        name: "Reward the CCTP bridger",
        description: "Reward the wallet address calling the function to confirm the cctp transactions on the destination chain",
        date: "12 Dec"
      },
      {
        name: "Final Manual Audit",
        description: "- Ensure the code is properly commented\n- Remove unused code\n- Make sure key functions are protected with the correct auth checks.",
        date: "16 Dec"
      },
      {
        name: "Documentation",
        description: "- Add the deployment feature\n- Update the documentation with the recent changes\n- Optionally improve the presentation of the documentation",
        date: "19 Dec"
      },
      {
        name: "Deployment on Main Net & Initial Configuration",
        description: "- Deploy all contracts on appropriate networks from an authorised and documented wallet.\n- Connect the bridges\n- Authorise the Native contracts with each other\n- Authorise the Local contracts with each other\n- Set all Local Chains\n- Mint Tokens and Send to-be-decided amount to the rewards contract\n- Perform a mock job cycle(successful & disputed) and governance cycle (on both chains)",
        date: "21 Dec"
      }
    ]
  }
};
