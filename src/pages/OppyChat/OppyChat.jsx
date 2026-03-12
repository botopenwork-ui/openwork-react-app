import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BlueButton from '../../components/BlueButton/BlueButton';
import { buildOppyChatContext } from './chatContext';
import {
  postJob,
  applyToJob,
  startJob,
  submitWork,
  releasePaymentCrossChain,
  raiseDispute,
  createProfile,
  approveUSDC,
  getContractAddress,
} from '../../services/localChainService';
import { getChainConfig, getNativeChain } from '../../config/chainConfig';
import GenesisABI from '../../ABIs/genesis_ABI.json';
import './OppyChat.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const SUGGESTED_PROMPTS = [
  'Post a job',
  'Apply to a job',
  'Release payment',
  'Check my jobs',
];

// ── Transaction Card ─────────────────────────────────────────────
function TransactionCard({ tool, onConfirm, onCancel }) {
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await onConfirm(tool);
      if (result?.txHash) setTxHash(result.txHash);
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  // Build explorer URL based on connected chain
  const getExplorerUrl = (hash) => {
    if (!window.ethereum) return `https://arbiscan.io/tx/${hash}`;
    const chainId = parseInt(window.ethereum.chainId, 16);
    const base = chainId === 10 ? 'https://optimistic.etherscan.io/tx/' :
                 chainId === 8453 ? 'https://basescan.org/tx/' :
                 chainId === 1 ? 'https://etherscan.io/tx/' :
                 'https://arbiscan.io/tx/';
    return `${base}${hash}`;
  };

  return (
    <div className="tx-card">
      <div className="tx-card-action">{tool.name}</div>
      <div className="tx-card-display">{tool.display}</div>
      <div className="tx-card-params">
        {Object.entries(tool.params || {}).map(([k, v]) => (
          <div className="tx-param-row" key={k}>
            <span className="tx-param-key">{k}:</span>
            <span className="tx-param-value">{String(v)}</span>
          </div>
        ))}
      </div>
      {!done ? (
        <div className="tx-card-actions">
          <BlueButton
            label={loading ? 'Signing…' : 'Confirm & Sign'}
            onClick={handleConfirm}
            disabled={loading}
            style={{ fontSize: '13px', height: '36px', padding: '0 16px', opacity: loading ? 0.7 : 1 }}
          />
          {!loading && <button className="tx-cancel-btn" onClick={onCancel}>Cancel</button>}
        </div>
      ) : txHash ? (
        <>
          <div className="tx-success-msg">✓ Transaction submitted</div>
          <a className="tx-hash-link" href={getExplorerUrl(txHash)} target="_blank" rel="noreferrer">
            View on Explorer: {txHash.slice(0, 18)}…
          </a>
        </>
      ) : (
        <div className="tx-success-msg" style={{ color: '#868686' }}>Processing…</div>
      )}
    </div>
  );
}

// ── Tool parsing ─────────────────────────────────────────────────
function parseToolBlock(text) {
  const match = text.match(/<tool>([\s\S]*?)<\/tool>/);
  if (!match) return { tool: null, cleanText: text };
  try {
    const tool = JSON.parse(match[1].trim());
    const cleanText = text.replace(/<tool>[\s\S]*?<\/tool>/, '').trim();
    return { tool, cleanText };
  } catch {
    return { tool: null, cleanText: text };
  }
}

// ── Wallet status bar ────────────────────────────────────────────
function WalletBar({ walletState, onConnect, onSwitchChain }) {
  const barStyle = {
    borderTop: '1px solid #f0f0f0',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };
  const pillBase = {
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'default',
  };
  const greenPill = { ...pillBase, background: '#e8f5e9', color: '#2e7d32' };
  const amberPill = { ...pillBase, background: '#fff8e1', color: '#f57f17' };
  const orangePill = { ...pillBase, background: '#fff3e0', color: '#e65100' };
  const blueBtn = { ...pillBase, background: '#0047FF', color: 'white', cursor: 'pointer' };

  if (!walletState.installed) {
    return (
      <div className="wallet-status-bar" style={barStyle}>
        <span style={amberPill}>⚠ MetaMask not installed</span>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          style={{ ...blueBtn, textDecoration: 'none', display: 'inline-block' }}
        >
          Install MetaMask
        </a>
      </div>
    );
  }
  if (!walletState.connected) {
    return (
      <div className="wallet-status-bar" style={barStyle}>
        <button style={blueBtn} onClick={onConnect}>Connect Wallet</button>
      </div>
    );
  }
  if (!walletState.isCorrectChain) {
    return (
      <div className="wallet-status-bar" style={barStyle}>
        <span style={orangePill}>Wrong network</span>
        <button style={blueBtn} onClick={onSwitchChain}>Switch to Arbitrum</button>
      </div>
    );
  }
  const short = walletState.address
    ? `${walletState.address.slice(0, 6)}…${walletState.address.slice(-4)}`
    : '';
  return (
    <div className="wallet-status-bar" style={barStyle}>
      <span style={greenPill}>● Connected</span>
      <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>{short}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
const OppyChat = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [walletState, setWalletState] = useState({
    installed: false,
    connected: false,
    address: null,
    chainId: null,
    isCorrectChain: false,
  });
  const [chat, setChat] = useState([
    {
      role: 'bot',
      text: "Hi! I'm **OpenWork AI**. I can answer questions about the protocol and help you execute transactions — post jobs, apply, release payments, and more. What would you like to do?",
    },
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Wallet detection
  async function detectWallet() {
    if (!window.ethereum) {
      setWalletState({ installed: false, connected: false, address: null, chainId: null, isCorrectChain: false });
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const allowedChains = ['0xa4b1', '0xa', '0x1', '0x2105'];
    setWalletState({
      installed: true,
      connected: accounts.length > 0,
      address: accounts[0] || null,
      chainId,
      isCorrectChain: allowedChains.includes(chainId.toLowerCase()),
    });
  }

  useEffect(() => {
    // MetaMask mobile injects window.ethereum slightly after page load
    // Try immediately, then retry after 500ms and 1500ms if not found
    detectWallet();
    const t1 = setTimeout(detectWallet, 500);
    const t2 = setTimeout(detectWallet, 1500);

    // Also listen for MetaMask's explicit init event
    const onInit = () => detectWallet();
    window.addEventListener('ethereum#initialized', onInit, { once: true });

    const wireEvents = () => {
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', detectWallet);
        window.ethereum.on('chainChanged', detectWallet);
      }
    };
    wireEvents();
    // Re-wire after retries in case ethereum appeared late
    const t3 = setTimeout(wireEvents, 1500);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener('ethereum#initialized', onInit);
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', detectWallet);
        window.ethereum.removeListener('chainChanged', detectWallet);
      }
    };
  }, []);

  // Build history array from current chat state (for multi-turn context)
  const buildHistory = (currentChat) => {
    return currentChat
      .filter(m => !m.isThinking)
      .slice(1) // skip greeting
      .map(m => ({ role: m.role === 'bot' ? 'oppy' : 'user', text: m.text }));
  };

  const sendMessage = async (userMsg) => {
    if (!userMsg.trim() || loading) return;

    setShowSuggestions(false);
    const history = buildHistory(chat);
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setChat(prev => [...prev, { role: 'bot', text: '', isThinking: true }]);

    try {
      const systemContext = buildOppyChatContext(walletState);

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: systemContext, history }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const { tool, cleanText } = parseToolBlock(data.response);
        setChat(prev => {
          const withoutThinking = prev.filter(m => !m.isThinking);
          const msgs = [...withoutThinking, { role: 'bot', text: cleanText }];
          if (tool) msgs.push({ role: 'bot', isTxCard: true, tool });
          return msgs;
        });
      } else {
        throw new Error(data.error || 'Chat API failed');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChat(prev => {
        const withoutThinking = prev.filter(m => !m.isThinking);
        return [...withoutThinking, { role: 'bot', text: "Sorry, I couldn't reach the server. Please try again." }];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
  };

  const handleSuggestion = (prompt) => {
    sendMessage(prompt);
  };

  // ── Chat helper ──────────────────────────────────────────────
  function addBotMessage(text, replaceLast = false) {
    setChat(prev => {
      if (replaceLast && prev.length > 0 && prev[prev.length - 1].role === 'bot') {
        return [...prev.slice(0, -1), { role: 'bot', text }];
      }
      return [...prev, { role: 'bot', text }];
    });
  }

  // ── Transaction handler ──────────────────────────────────────
  const handleTransaction = async (tool) => {
    console.log('[OppyChat] Transaction requested:', tool);

    try {
      if (!window.ethereum) {
        addBotMessage('Please install MetaMask to execute transactions.');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainIdDecimal = parseInt(chainHex, 16);
      const userAddress = accounts[0];

      if (!userAddress) {
        addBotMessage('Please connect your wallet first.');
        return;
      }

      const onStatus = (msg) => addBotMessage(msg, true);

      const explorerBase =
        chainIdDecimal === 42161 ? 'https://arbiscan.io/tx/' :
        chainIdDecimal === 10    ? 'https://optimistic.etherscan.io/tx/' :
        chainIdDecimal === 8453  ? 'https://basescan.org/tx/' :
                                   'https://etherscan.io/tx/';

      // ── Helper: USDC approval ──────────────────────────────
      const ensureUSDCApproval = async (spender, amountUSDC) => {
        const config = getChainConfig(chainIdDecimal);
        if (!config?.contracts?.usdc) return;
        const usdcABI = [
          { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
          { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' }
        ];
        const Web3 = (await import('web3')).default;
        const web3 = new Web3(window.ethereum);
        const usdc = new web3.eth.Contract(usdcABI, config.contracts.usdc);
        const allowance = BigInt(await usdc.methods.allowance(userAddress, spender).call());
        const needed = BigInt(amountUSDC);
        if (allowance < needed) {
          addBotMessage('Approving USDC — confirm in MetaMask…', true);
          await usdc.methods.approve(spender, needed.toString()).send({ from: userAddress, gas: 100000 });
        }
      };

      // ── Helper: IPFS upload ────────────────────────────────
      const uploadToIPFS = async (data) => {
        const res = await fetch(`${BACKEND_URL}/api/ipfs/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('IPFS upload failed');
        const json = await res.json();
        return json.hash || json.IpfsHash;
      };

      let result;

      switch (tool.name) {
        case 'postJob': {
          addBotMessage('Uploading job details to IPFS…');
          const budget = Number(tool.params.budget) || 0;
          const milestones = tool.params.milestones || [{ description: 'Full payment', amount: budget }];

          // Upload job header to IPFS
          const jobDetailHash = await uploadToIPFS({ title: tool.params.title, description: tool.params.description, budget });

          // Upload each milestone description to IPFS
          const milestoneHashes = await Promise.all(milestones.map(m => uploadToIPFS({ description: m.description || m.title || 'Milestone', amount: m.amount })));
          const milestoneAmounts = milestones.map(m => Math.floor((m.amount || 0) * 1000000)); // 6 decimals

          // Approve USDC to LOWJC contract
          const totalUSDC = milestoneAmounts.reduce((a, b) => a + b, 0);
          const lowjcAddress = getContractAddress(chainIdDecimal, 'lowjc');
          if (lowjcAddress && totalUSDC > 0) await ensureUSDCApproval(lowjcAddress, totalUSDC);

          result = await postJob(chainIdDecimal, userAddress, {
            jobDetailHash,
            descriptions: milestoneHashes,
            amounts: milestoneAmounts,
          }, onStatus);
          break;
        }

        case 'applyToJob': {
          addBotMessage('Uploading proposal to IPFS…');
          const applicationHash = await uploadToIPFS({ proposal: tool.params.proposal, jobId: tool.params.jobId });
          // Upload a single milestone hash for the application
          const appMilestoneHash = await uploadToIPFS({ description: tool.params.proposal });

          // Determine amounts: use proposedAmount param, fallback to job milestones, then 1 USDC
          let applyAmounts;
          if (tool.params.proposedAmount && Number(tool.params.proposedAmount) > 0) {
            applyAmounts = [Math.round(Number(tool.params.proposedAmount) * 1e6)];
          } else {
            try {
              addBotMessage('Fetching job milestone amounts from contract…', true);
              const nativeChain = getNativeChain();
              const arbRpc = nativeChain?.rpcUrl || 'https://arb1.arbitrum.io/rpc';
              const genesisAddress = nativeChain?.contracts?.genesis;
              if (!genesisAddress) throw new Error('No genesis address');
              const Web3 = (await import('web3')).default;
              const arbWeb3 = new Web3(arbRpc);
              const genesisContract = new arbWeb3.eth.Contract(GenesisABI, genesisAddress);
              const jobData = await genesisContract.methods.getJob(tool.params.jobId).call();
              const milestones = jobData?.milestonePayments || jobData[6] || [];
              if (milestones.length > 0) {
                applyAmounts = milestones.map(m => Number(m.amount || m[1] || 0));
              } else {
                applyAmounts = [1000000]; // 1 USDC fallback
              }
            } catch (e) {
              console.warn('[applyToJob] Could not fetch job milestones:', e.message);
              applyAmounts = [1000000]; // 1 USDC fallback
            }
          }

          result = await applyToJob(chainIdDecimal, userAddress, {
            jobId: tool.params.jobId,
            applicationHash,
            descriptions: [appMilestoneHash],
            amounts: applyAmounts,
            preferredChainDomain: tool.params.preferredChainDomain || 3, // default Arbitrum CCTP domain
          }, onStatus);
          break;
        }

        case 'startJob': {
          // Determine applicationId: use provided value, or look up from Genesis contract
          let resolvedApplicationId = tool.params.applicationId;
          const applicantAddress = tool.params.applicantAddress || tool.params.applicant;

          if (!resolvedApplicationId && applicantAddress) {
            try {
              addBotMessage(`Looking up application ID for ${applicantAddress.slice(0, 8)}… on Arbitrum…`);
              const nativeChain = getNativeChain();
              const arbRpc = nativeChain?.rpcUrl || 'https://arb1.arbitrum.io/rpc';
              const genesisAddress = nativeChain?.contracts?.genesis;
              if (!genesisAddress) throw new Error('No genesis address');
              const Web3 = (await import('web3')).default;
              const arbWeb3 = new Web3(arbRpc);
              const genesisContract = new arbWeb3.eth.Contract(GenesisABI, genesisAddress);
              const appCount = Number(await genesisContract.methods.getJobApplicationCount(tool.params.jobId).call());
              for (let i = 0; i < appCount; i++) {
                const app = await genesisContract.methods.getJobApplication(tool.params.jobId, i).call();
                const appApplicant = app?.applicant || app[2];
                if (appApplicant && appApplicant.toLowerCase() === applicantAddress.toLowerCase()) {
                  resolvedApplicationId = Number(app?.id ?? app[0] ?? i);
                  break;
                }
              }
              if (resolvedApplicationId === undefined || resolvedApplicationId === null) {
                throw new Error(`No application found for ${applicantAddress} on job ${tool.params.jobId}`);
              }
              addBotMessage(`Found application ID: ${resolvedApplicationId}. Starting job…`, true);
            } catch (e) {
              addBotMessage(`Could not auto-lookup application ID: ${e.message}`);
              return { txHash: null };
            }
          }

          if (resolvedApplicationId === undefined || resolvedApplicationId === null) {
            addBotMessage('Please provide the applicant\'s wallet address so I can look up their application.');
            return { txHash: null };
          }

          result = await startJob(chainIdDecimal, userAddress, {
            jobId: tool.params.jobId,
            applicationId: resolvedApplicationId,
            useAppMilestones: tool.params.useAppMilestones || false,
          }, onStatus);
          break;
        }

        case 'submitWork': {
          addBotMessage('Uploading work submission to IPFS…');
          const submissionHash = await uploadToIPFS({ workDetails: tool.params.workDetails, jobId: tool.params.jobId });
          result = await submitWork(chainIdDecimal, userAddress, {
            jobId: tool.params.jobId,
            submissionHash,
          }, onStatus);
          break;
        }

        case 'releasePayment': {
          result = await releasePaymentCrossChain(chainIdDecimal, userAddress, {
            jobId: tool.params.jobId,
            // For cross-chain, these are needed; for native Arb they're ignored
            targetChainDomain: tool.params.targetChainDomain,
            targetRecipient: tool.params.targetRecipient,
          }, onStatus);
          break;
        }

        case 'raiseDispute': {
          addBotMessage('Uploading dispute details to IPFS…');
          const disputeHash = await uploadToIPFS({ reason: tool.params.reason, jobId: tool.params.jobId });
          result = await raiseDispute(chainIdDecimal, userAddress, {
            jobId: tool.params.jobId,
            disputeHash,
            reason: tool.params.reason,
          }, onStatus);
          break;
        }

        case 'createProfile': {
          result = await createProfile(chainIdDecimal, userAddress, {
            name: tool.params.name,
            skills: tool.params.skills,
            hourlyRate: tool.params.hourlyRate,
          }, onStatus);
          break;
        }

        case 'startDirectContract': {
          addBotMessage('Opening the direct contract form with your details pre-filled…');
          const dcParams = new URLSearchParams({
            title: tool.params.title || '',
            description: tool.params.description || '',
            budget: tool.params.budget || '',
            taker: tool.params.jobTaker || tool.params.taker || '',
          });
          setTimeout(() => navigate(`/direct-contract?${dcParams.toString()}`), 1200);
          return;
        }

        default:
          addBotMessage(`Unknown transaction type: ${tool.name}`);
          return;
      }

      addBotMessage(`✅ Transaction confirmed!\n\n[View on explorer](${explorerBase}${result.transactionHash})`);
      return { txHash: result.transactionHash };

    } catch (error) {
      const msg = error.message || 'Transaction failed';
      if (msg.includes('user rejected') || msg.includes('4001')) {
        addBotMessage("Transaction cancelled. Let me know when you're ready to try again.");
      } else if (msg.includes('insufficient funds')) {
        addBotMessage("You don't have enough ETH for gas fees. You'll need a small amount of ETH on the connected chain.");
      } else {
        addBotMessage(`Transaction failed: ${msg}`);
      }
      return { txHash: null };
    }
  };

  const handleConnectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      detectWallet();
    } catch (err) {
      console.error('[OppyChat] Connect wallet error:', err);
    }
  };

  const handleSwitchChain = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xa4b1' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xa4b1',
              chainName: 'Arbitrum One',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://arb1.arbitrum.io/rpc'],
              blockExplorerUrls: ['https://arbiscan.io'],
            }],
          });
        } catch (addError) {
          console.error('[OppyChat] Add Arbitrum chain error:', addError);
        }
      } else {
        console.error('[OppyChat] Switch chain error:', switchError);
      }
    }
  };

  const handleCancelTx = (idx) => {
    setChat(prev => prev.filter((_, i) => i !== idx));
  };

  // Inline styles guarantee mobile layout wins regardless of CSS import order
  const mob = typeof window !== 'undefined' && window.innerWidth <= 768;

  const mobPage   = mob ? { position:'fixed', top:0, left:0, right:0, bottom:0, display:'flex', flexDirection:'column', background:'#fff', zIndex:1000, overflow:'hidden', width:'100vw', maxWidth:'100vw' } : {};
  const mobBody   = mob ? { padding:0, flex:1, display:'flex', flexDirection:'column', overflow:'hidden', width:'100vw', maxWidth:'100vw', alignItems:'stretch' } : {};
  const mobVjc    = mob ? { position:'relative', top:0, maxWidth:'100vw', margin:0, flex:1, display:'flex', flexDirection:'column', overflow:'hidden', width:'100vw', boxSizing:'border-box' } : {};
  const mobTitle  = mob ? { borderRadius:0, borderLeft:'none', borderRight:'none', borderTop:'none', height:52, minHeight:52, flexShrink:0, padding:'0 8px', width:'100%', boxSizing:'border-box' } : {};
  const mobCard   = mob ? { flex:1, display:'flex', flexDirection:'column', borderRadius:0, border:'none', overflow:'hidden', minHeight:0, width:'100%', boxSizing:'border-box' } : {};
  const mobMsgs   = mob ? { flex:'1 1 0%', minHeight:0, maxHeight:'none', padding:'14px 14px 8px 14px', overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', width:'100%', boxSizing:'border-box' } : {};
  const mobInput  = mob ? { padding:'10px 12px 16px 12px', flexShrink:0, background:'#fff', display:'flex', alignItems:'center', gap:10, boxSizing:'border-box', width:'100%', maxWidth:'100vw', borderTop:'1.5px solid #f0f0f0' } : {};
  const mobField  = mob ? { fontSize:16, padding:'12px 13px', flex:'1 1 0%', minWidth:0, boxSizing:'border-box' } : {};
  const mobBtn    = mob ? { width:46, minWidth:46, height:46, flexShrink:0 } : {};
  const mobSugg   = mob ? { padding:'8px 14px', flexWrap:'nowrap', overflowX:'auto', WebkitOverflowScrolling:'touch', flexShrink:0 } : {};

  return (
    <div className="oppy-chat-page" style={mobPage}>
    <div className="body-container" style={mobBody}>
      <div className="view-jobs-container" style={mobVjc}>

        {/* Title section */}
        <div className="title-section" style={mobTitle}>
          <div
            className="backButtonV"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <img className="backIconV" src="/back.svg" alt="Back" />
          </div>
          <div className="oppy-chat-header">
            <div className="oppy-chat-icon">
              <Bot size={18} color="#fff" />
            </div>
            <div className="oppy-chat-header-text">
              <span className="oppy-chat-title">OpenWork AI</span>
              <span className="oppy-chat-subtitle">Ask anything · Execute transactions</span>
            </div>
          </div>
        </div>

        {/* Chat card */}
        <div className="table-section" style={mobCard}>

          {/* Messages */}
          <div className="chat-messages-area" style={mobMsgs}>
            {chat.map((msg, idx) => {
              if (msg.isTxCard) {
                return (
                  <div className="chat-msg-row bot" key={idx}>
                    <TransactionCard
                      tool={msg.tool}
                      onConfirm={handleTransaction}
                      onCancel={() => handleCancelTx(idx)}
                    />
                  </div>
                );
              }
              if (msg.isThinking) {
                return (
                  <div className="chat-msg-row bot" key={idx}>
                    <div className="chat-bubble bot">
                      <div className="thinking-dots">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className={`chat-msg-row ${msg.role === 'user' ? 'user' : 'bot'}`} key={idx}>
                  <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {msg.role === 'bot' ? (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}
          {showSuggestions && (
            <div className="chat-suggestions" style={mobSugg}>
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  className="chat-suggestion-chip"
                  onClick={() => handleSuggestion(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Wallet status bar */}
          <WalletBar
            walletState={walletState}
            onConnect={handleConnectWallet}
            onSwitchChain={handleSwitchChain}
          />

          {/* Input bar */}
          <form className="chat-input-bar" onSubmit={handleSubmit} style={mobInput}>
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Ask anything or describe a transaction…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              style={mobField}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send"
              style={mobBtn}
            >
              <Send size={16} />
            </button>
          </form>

        </div>
      </div>
    </div>
    </div>
  );
};

export default OppyChat;
