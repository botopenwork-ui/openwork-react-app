// OppyChat system context builder
// Used for the AI-powered chat page with transaction capabilities

import { BASE_SYSTEM_KNOWLEDGE } from '../Documentation/data/oppyKnowledge';
import { MAINNET_CHAIN_CONFIG } from '../../config/chainConfig';

const TRANSACTION_TOOLS_PROMPT = `
## TRANSACTION CAPABILITIES

You can help users execute OpenWork transactions. When a user clearly wants to perform one of these actions AND has provided enough information, respond normally AND embed a tool call at the end of your response:

<tool>
{"name": "TOOL_NAME", "params": {...}, "display": "Human readable summary"}
</tool>

Available tools:
- postJob(title, budget, description, milestones?) — Post a new job. budget is a number in USDC. milestones is optional array of {description, amount}. Default is single milestone = full budget. Ask for missing required params.
- applyToJob(jobId, proposal, proposedAmount?, preferredChainDomain?) — Apply to a job. jobId is numeric. proposal is text. proposedAmount is optional number in USDC (e.g. 100 for $100). preferredChainDomain defaults to 3 (Arbitrum).
- startJob(jobId, applicantAddress, useAppMilestones?) — Hire an applicant. jobId is numeric. applicantAddress is the wallet address (0x...) of the applicant to hire. DO NOT ask for applicationId — the frontend will look it up automatically. useAppMilestones defaults to false.
- submitWork(jobId, workDetails) — Submit completed work. jobId is numeric. workDetails is a text description.
- releasePayment(jobId, targetChainDomain?, targetRecipient?) — Release payment. jobId is numeric. For Arbitrum-only jobs, jobId is enough. For cross-chain, need targetChainDomain and targetRecipient.
- raiseDispute(jobId, reason) — Raise a dispute. jobId is numeric. reason is text.
- createProfile(name, skills, hourlyRate) — Create a freelancer profile. name is display name. skills is a comma-separated list. hourlyRate is a number in USDC.
- startDirectContract(title, budget, description, jobTaker) — Hire a specific person directly. jobTaker is their wallet address (0x...). Asks for missing params including wallet address.

IMPORTANT: Only embed <tool> when the user has explicitly confirmed they want to transact. Always ask for missing required params first. Never embed multiple <tool> blocks. Keep the <tool> block on its own at the very end of your response.
`;

function getContractAddressesSection() {
  const op = MAINNET_CHAIN_CONFIG[10];
  const arb = MAINNET_CHAIN_CONFIG[42161];
  return `
## MAINNET CONTRACT ADDRESSES

### Optimism (Chain ID: 10) — Primary local chain for job operations
- LOWJC (Local OpenWork Job Contract): ${op?.contracts?.lowjc || 'N/A'}
- Athena Client: ${op?.contracts?.athenaClient || 'N/A'}
- Local Bridge: ${op?.contracts?.localBridge || 'N/A'}
- USDC: ${op?.contracts?.usdc || 'N/A'}
- Block Explorer: ${op?.blockExplorer || 'https://optimistic.etherscan.io'}

### Arbitrum One (Chain ID: 42161) — Native data hub
- NOWJC (Native OpenWork Job Contract): ${arb?.contracts?.nowjc || 'N/A'}
- OpenworkGenesis: ${arb?.contracts?.genesis || 'N/A'}
- ProfileGenesis: ${arb?.contracts?.profileGenesis || 'N/A'}
- Native Athena: ${arb?.contracts?.nativeAthena || 'N/A'}
- Native DAO: ${arb?.contracts?.nativeDAO || 'N/A'}
- USDC: ${arb?.contracts?.usdc || 'N/A'}
- Block Explorer: ${arb?.blockExplorer || 'https://arbiscan.io'}
`;
}

const TRANSACTION_TOOLS_SECTION = TRANSACTION_TOOLS_PROMPT;

export function buildOppyChatContext(walletState = {}) {
  let context = BASE_SYSTEM_KNOWLEDGE + getContractAddressesSection() + TRANSACTION_TOOLS_SECTION;

  context += `\n\n## CURRENT USER WALLET STATE\n`;
  if (!walletState.installed) {
    context += `- MetaMask: NOT INSTALLED\n- Status: User needs to install MetaMask first\n- MetaMask install URL: https://metamask.io/download/\n`;
  } else if (!walletState.connected) {
    context += `- MetaMask: Installed but NOT connected\n- Status: User needs to connect wallet\n`;
  } else if (!walletState.isCorrectChain) {
    context += `- MetaMask: Connected (${walletState.address})\n- Chain: ${walletState.chainId} (NOT a supported chain)\n- Supported chains: Arbitrum One (0xa4b1), Optimism (0xa), Ethereum (0x1), Base (0x2105)\n`;
  } else {
    context += `- MetaMask: Connected ✓\n- Address: ${walletState.address}\n- Chain: ${walletState.chainId} ✓\n`;
  }

  return context;
}
