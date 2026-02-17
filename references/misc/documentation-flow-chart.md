import React, { useState, useMemo } from 'react';
import { FileText, Code, TestTube, Play, Database, History, ArrowRight, Edit2, Rocket, ChevronDown, ChevronRight, MessageSquare, Send } from 'lucide-react';

const OpenWorkBuilder = () => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedBridge, setSelectedBridge] = useState(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [editingStatus, setEditingStatus] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [oppyMessage, setOppyMessage] = useState('');
  const [oppyChat, setOppyChat] = useState([
    { role: 'oppy', text: 'Hi! I\'m Agent Oppy, your OpenWork assistant. Ask me anything about the protocol, contracts, or how to get started!' }
  ]);
  
  const [contracts] = useState({
    token: {
      id: 'token',
      name: 'OpenWork Token',
      chain: 'ethereum',
      x: 110,
      y: 240,
      status: 'mainnet',
      version: 'v1.2.3',
      gas: '2.1M',
      mainnetNetwork: 'Ethereum Mainnet',
      testnetNetwork: 'Ethereum Sepolia',
      mainnetDeployed: 'Oct 15, 2024',
      testnetDeployed: 'Sep 10, 2024',
      mainnetAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      testnetAddress: '0x9Ec7Bf6c4a25f7bD326B8D8e0c0e8e5D9A7b3c2f',
      tvl: '$12.4M',
      totalSupply: '100M tokens',
      holders: '8,432',
      docs: 'ERC-20 token for OpenWork protocol. Handles governance and rewards.'
    },
    governance: {
      id: 'governance',
      name: 'Governance',
      chain: 'ethereum',
      x: 110,
      y: 340,
      status: 'mainnet',
      version: 'v2.1.0',
      gas: '890K',
      mainnetNetwork: 'Ethereum Mainnet',
      testnetNetwork: 'Ethereum Sepolia',
      mainnetDeployed: 'Sep 28, 2024',
      testnetDeployed: 'Aug 15, 2024',
      mainnetAddress: '0x1234567890abcdef1234567890abcdef12345678',
      testnetAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      tvl: '$5.2M',
      docs: 'Handles governance operations with 48-hour timelock.'
    },
    dao: {
      id: 'dao',
      name: 'DAO Core',
      chain: 'l2',
      x: 480,
      y: 190,
      status: 'testnet',
      version: 'v0.8.2',
      gas: '45K',
      mainnetNetwork: 'Base Mainnet',
      testnetNetwork: 'Base Sepolia',
      mainnetDeployed: 'Oct 22, 2024',
      testnetDeployed: 'Oct 1, 2024',
      mainnetAddress: '0x2345678901bcdef2345678901bcdef234567890',
      testnetAddress: '0xbcdef2345678901bcdef2345678901bcdef2345',
      tvl: '$3.8M',
      docs: 'Main DAO operations on Base L2.'
    },
    athena: {
      id: 'athena',
      name: 'Athena',
      chain: 'l2',
      x: 480,
      y: 280,
      status: 'local',
      version: 'v0.3.1',
      gas: '78K',
      mainnetNetwork: 'Base Mainnet',
      testnetNetwork: 'Base Sepolia',
      mainnetDeployed: 'Not deployed',
      testnetDeployed: 'Oct 28, 2024',
      mainnetAddress: null,
      testnetAddress: '0xcdef3456789012cdef3456789012cdef34567890',
      tvl: '$0',
      docs: 'AI-powered dispute resolution using oracle votes.'
    },
    jobs: {
      id: 'jobs',
      name: 'Job Registry',
      chain: 'l2',
      x: 620,
      y: 190,
      status: 'testnet',
      version: 'v1.0.0',
      gas: '56K',
      mainnetNetwork: 'Base Mainnet',
      testnetNetwork: 'Base Sepolia',
      mainnetDeployed: 'Nov 1, 2024',
      testnetDeployed: 'Oct 20, 2024',
      mainnetAddress: '0x4567890123def4567890123def45678901234567',
      testnetAddress: '0xdef4567890123def4567890123def4567890123',
      tvl: '$1.9M',
      docs: 'Central registry for all jobs and escrow.'
    },
    rewards: {
      id: 'rewards',
      name: 'Rewards',
      chain: 'l2',
      x: 620,
      y: 280,
      status: 'local',
      version: 'v0.5.2',
      gas: '34K',
      mainnetNetwork: 'Base Mainnet',
      testnetNetwork: 'Base Sepolia',
      mainnetDeployed: 'Not deployed',
      testnetDeployed: 'Oct 25, 2024',
      mainnetAddress: null,
      testnetAddress: '0xef56789012345ef56789012345ef5678901234',
      tvl: '$0',
      docs: 'Handles reward distribution and vesting.'
    },
    cctpBase: {
      id: 'cctp-base',
      name: 'CCTP Base',
      chain: 'l2',
      x: 480,
      y: 370,
      status: 'mainnet',
      version: 'v1.1.0',
      gas: '67K',
      mainnetNetwork: 'Base Mainnet',
      testnetNetwork: 'Base Sepolia',
      mainnetDeployed: 'Sep 30, 2024',
      testnetDeployed: 'Sep 15, 2024',
      mainnetAddress: '0x5678901234ef5678901234ef56789012345678',
      testnetAddress: '0xf6789012345f6789012345f678901234567890',
      tvl: '$18.7M',
      docs: 'Circle CCTP bridge endpoint on Base L2.'
    },
    arbitrum: {
      id: 'arbitrum',
      name: 'CCTP Arbitrum',
      chain: 'user',
      x: 850,
      y: 240,
      status: 'testnet',
      version: 'v0.9.0',
      gas: '23K',
      mainnetNetwork: 'Arbitrum One',
      testnetNetwork: 'Arbitrum Sepolia',
      mainnetDeployed: 'Oct 18, 2024',
      testnetDeployed: 'Oct 5, 2024',
      mainnetAddress: '0x678901234f678901234f67890123456789012',
      testnetAddress: '0x789012345678901234567890123456789012345',
      tvl: '$9.2M',
      docs: 'Arbitrum endpoint for OpenWork operations.'
    },
    polygon: {
      id: 'polygon',
      name: 'CCTP Polygon',
      chain: 'user',
      x: 850,
      y: 330,
      status: 'local',
      version: 'v0.7.1',
      gas: '19K',
      mainnetNetwork: 'Polygon PoS',
      testnetNetwork: 'Polygon Amoy',
      mainnetDeployed: 'Not deployed',
      testnetDeployed: 'Oct 24, 2024',
      mainnetAddress: null,
      testnetAddress: '0x89012345689012345689012345678901234567',
      tvl: '$0',
      docs: 'Polygon endpoint for OpenWork operations.'
    }
  });

  const [bridges] = useState([
    {
      id: 'layerzero-bridge',
      name: 'LayerZero Bridge',
      from: { x: 240, y: 300 },
      to: { x: 480, y: 240 },
      protocol: 'LayerZero',
      docs: 'Cross-chain messaging between Ethereum and Base L2.',
      status: 'mainnet',
      version: 'v1.0.0',
      tvl: '$2.4M',
      mainnetAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      testnetAddress: '0x9Ec7Bf6c4a25f7bD326B8D8e0c0e8e5D9A7b3c2f'
    },
    {
      id: 'cctp-arbitrum',
      name: 'CCTP Bridge',
      from: { x: 610, y: 400 },
      to: { x: 850, y: 260 },
      protocol: 'Circle CCTP',
      docs: 'USDC transfers between Base and Arbitrum.',
      status: 'mainnet',
      version: 'v1.1.0',
      tvl: '$8.7M',
      mainnetAddress: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
      testnetAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
    },
    {
      id: 'cctp-polygon',
      name: 'CCTP Bridge',
      from: { x: 610, y: 410 },
      to: { x: 850, y: 350 },
      protocol: 'Circle CCTP',
      docs: 'USDC transfers between Base and Polygon.',
      status: 'testnet',
      version: 'v1.0.2',
      tvl: '$1.2M',
      mainnetAddress: null,
      testnetAddress: '0x2B4069517957735bE00ceE0fadAE88a26365528f'
    }
  ]);

  const ipfsData = {
    gateway: 'https://ipfs.io/ipfs/',
    docs: 'IPFS stores job descriptions, submission proofs, and dispute evidence.',
    examples: [
      {
        title: 'Upload Job Description',
        description: 'Store job requirements on IPFS.',
        code: 'const hash = await uploadToIPFS(jobData);'
      },
      {
        title: 'Retrieve Job',
        description: 'Fetch job details using IPFS hash.',
        code: 'const job = await getFromIPFS(hash);'
      }
    ]
  };

  const statusColors = {
    mainnet: 'bg-blue-500',
    testnet: 'bg-blue-400',
    local: 'bg-blue-300',
    'not-started': 'bg-gray-300'
  };

  const selected = selectedContract && selectedContract !== 'ipfs' && selectedContract !== 'oppy' ? contracts[selectedContract] : null;
  const selectedBridgeObj = selectedBridge ? bridges.find(b => b.id === selectedBridge) : null;

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const contractsByChain = useMemo(() => {
    const ethereum = Object.values(contracts).filter(c => c.chain === 'ethereum');
    const l2 = Object.values(contracts).filter(c => c.chain === 'l2');
    const user = Object.values(contracts).filter(c => c.chain === 'user');
    
    const getBounds = (contractList) => {
      if (contractList.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      const padding = 30;
      const contractWidth = 130;
      const contractHeight = 80;
      
      const minX = Math.min(...contractList.map(c => c.x)) - padding;
      const minY = Math.min(...contractList.map(c => c.y)) - padding;
      const maxX = Math.max(...contractList.map(c => c.x)) + contractWidth + padding;
      const maxY = Math.max(...contractList.map(c => c.y)) + contractHeight + padding;
      
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    };
    
    return {
      ethereum: { contracts: ethereum, bounds: getBounds(ethereum) },
      l2: { contracts: l2, bounds: getBounds(l2) },
      user: { contracts: user, bounds: getBounds(user) }
    };
  }, [contracts]);

  const handleOppySubmit = (e) => {
    e.preventDefault();
    if (!oppyMessage.trim()) return;

    const userMsg = oppyMessage;
    setOppyChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setOppyMessage('');

    setTimeout(() => {
      let response = '';
      const lowerMsg = userMsg.toLowerCase();
      
      if (lowerMsg.includes('athena') || lowerMsg.includes('dispute')) {
        response = 'Athena is our AI-powered dispute resolution contract. It uses oracle member votes to resolve disputes fairly. Disputes require a minimum $50 fee and are voted on by verified skill oracle members.';
      } else if (lowerMsg.includes('job') || lowerMsg.includes('escrow')) {
        response = 'The Job Registry manages all jobs on OpenWork. When a job is posted, payment is locked in escrow. Once both parties agree the work is complete, payment is automatically released.';
      } else if (lowerMsg.includes('bridge') || lowerMsg.includes('cctp')) {
        response = 'We use Circle\'s CCTP (Cross-Chain Transfer Protocol) to bridge USDC between Base L2 and other chains like Arbitrum and Polygon. The LayerZero bridge handles governance messages between Ethereum and Base.';
      } else if (lowerMsg.includes('ipfs')) {
        response = 'IPFS stores all job descriptions, submission proofs, and dispute evidence in a decentralized way. This ensures transparency and immutability of all work records.';
      } else if (lowerMsg.includes('deploy') || lowerMsg.includes('start')) {
        response = 'To deploy a contract, select it from the sidebar, go to the Deploy tab, choose your network (mainnet or testnet), and click Deploy. Make sure your wallet is connected!';
      } else if (lowerMsg.includes('token') || lowerMsg.includes('work')) {
        response = 'The WORK token is our ERC-20 governance token on Ethereum. Token holders can create proposals, vote on changes, and earn rewards for contributing to the protocol.';
      } else {
        response = 'I can help you understand OpenWork contracts, bridges, IPFS integration, or how to deploy. What would you like to know more about?';
      }
      
      setOppyChat(prev => [...prev, { role: 'oppy', text: response }]);
    }, 500);
  };

  return (
    <div className="w-full h-screen bg-white flex">
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h1 className="text-xl font-light mb-1 text-gray-900">OpenWork</h1>
        <p className="text-xs text-gray-500 mb-8 font-light">Builder Framework</p>

        <div className="space-y-6">
          <div>
            <div 
              onClick={() => {
                setSelectedContract('oppy');
                setSelectedBridge(null);
                setActiveTab('docs');
              }}
              className={`text-sm px-3 py-2 rounded cursor-pointer mb-4 font-light transition-all ${selectedContract === 'oppy' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm' : 'hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
            >
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="font-medium">Agent Oppy</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Ethereum</h3>
            {contractsByChain.ethereum.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setSelectedBridge(null);
                  setActiveTab('docs');
                }}
                className={`text-sm px-3 py-2 rounded cursor-pointer mb-1 font-light transition-all ${selectedContract === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">OpenWork Chain on Base L2</h3>
            {contractsByChain.l2.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setSelectedBridge(null);
                  setActiveTab('docs');
                }}
                className={`text-sm px-3 py-2 rounded cursor-pointer mb-1 font-light transition-all ${selectedContract === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">User Chains</h3>
            {contractsByChain.user.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setSelectedBridge(null);
                  setActiveTab('docs');
                }}
                className={`text-sm px-3 py-2 rounded cursor-pointer mb-1 font-light transition-all ${selectedContract === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Bridges</h3>
            {bridges.map(b => (
              <div 
                key={b.id}
                onClick={() => {
                  setSelectedBridge(b.id);
                  setSelectedContract(null);
                  setActiveTab('docs');
                }}
                className={`text-sm px-3 py-2 rounded cursor-pointer mb-1 font-light transition-all ${selectedBridge === b.id ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <div className="flex items-center">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  {b.protocol}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div 
              onClick={() => {
                setSelectedContract('ipfs');
                setSelectedBridge(null);
                setActiveTab('docs');
              }}
              className={`text-sm px-3 py-2 rounded cursor-pointer mb-1 font-light transition-all ${selectedContract === 'ipfs' ? 'bg-pink-50 text-pink-700' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <div className="flex items-center">
                <Database className="w-3 h-3 mr-1" />
                IPFS Storage
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-white opacity-50"></div>
        
        <div className="absolute bg-pink-50 border border-pink-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all" 
             style={{ left: 50, top: 50, width: 140 }}
             onClick={() => {
               setSelectedContract('ipfs');
               setSelectedBridge(null);
               setActiveTab('docs');
             }}>
          <div className="flex items-center text-pink-700 font-medium text-xs mb-2">
            <Database className="w-3 h-3 mr-1" />
            IPFS
          </div>
          <div className="text-xs text-pink-600 space-y-1 font-light">
            <div>Job Descriptions</div>
            <div>Submissions</div>
            <div>Evidence</div>
          </div>
        </div>

        {contractsByChain.ethereum.bounds.width > 0 && (
          <>
            <div className="absolute bg-blue-50 border border-blue-100 rounded-xl opacity-40" 
                 style={{ 
                   left: contractsByChain.ethereum.bounds.minX, 
                   top: contractsByChain.ethereum.bounds.minY, 
                   width: contractsByChain.ethereum.bounds.width, 
                   height: contractsByChain.ethereum.bounds.height 
                 }}></div>
            <div className="absolute text-xs font-medium text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100" 
                 style={{ left: contractsByChain.ethereum.bounds.minX + 10, top: contractsByChain.ethereum.bounds.minY - 25 }}>
              Ethereum Mainnet
            </div>
          </>
        )}

        {contractsByChain.l2.bounds.width > 0 && (
          <>
            <div className="absolute bg-blue-100 border border-blue-200 rounded-xl opacity-40" 
                 style={{ 
                   left: contractsByChain.l2.bounds.minX, 
                   top: contractsByChain.l2.bounds.minY, 
                   width: contractsByChain.l2.bounds.width, 
                   height: contractsByChain.l2.bounds.height 
                 }}></div>
            <div className="absolute text-xs font-medium text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100" 
                 style={{ left: contractsByChain.l2.bounds.minX + 10, top: contractsByChain.l2.bounds.minY - 25 }}>
              OpenWork Chain on Base L2
            </div>
          </>
        )}

        {contractsByChain.user.bounds.width > 0 && (
          <>
            <div className="absolute bg-purple-50 border border-purple-200 rounded-xl opacity-40" 
                 style={{ 
                   left: contractsByChain.user.bounds.minX, 
                   top: contractsByChain.user.bounds.minY, 
                   width: contractsByChain.user.bounds.width, 
                   height: contractsByChain.user.bounds.height 
                 }}></div>
            <div className="absolute text-xs font-medium text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100" 
                 style={{ left: contractsByChain.user.bounds.minX + 10, top: contractsByChain.user.bounds.minY - 25 }}>
              User Chains
            </div>
          </>
        )}

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#3b82f6" opacity="0.6" />
            </marker>
          </defs>
          {bridges.map(bridge => (
            <line 
              key={bridge.id}
              x1={bridge.from.x} 
              y1={bridge.from.y} 
              x2={bridge.to.x} 
              y2={bridge.to.y} 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeDasharray="5,5" 
              opacity="0.4" 
              markerEnd="url(#arrow)" 
            />
          ))}
        </svg>

        {bridges.map(bridge => {
          const midX = (bridge.from.x + bridge.to.x) / 2;
          const midY = (bridge.from.y + bridge.to.y) / 2;
          return (
            <div
              key={`label-${bridge.id}`}
              onClick={() => {
                setSelectedBridge(bridge.id);
                setSelectedContract(null);
                setActiveTab('docs');
              }}
              className={`absolute bg-purple-100 border-2 px-2 py-1 rounded cursor-pointer shadow-sm hover:shadow-md transition-all ${selectedBridge === bridge.id ? 'border-purple-600 ring-2 ring-purple-300' : 'border-purple-400'}`}
              style={{ 
                left: midX - 40, 
                top: midY - 15,
                width: 80
              }}
            >
              <div className="text-xs font-semibold text-purple-900 text-center">{bridge.protocol}</div>
              <div className="text-xs text-purple-700 text-center font-light">{bridge.version}</div>
            </div>
          );
        })}

        {Object.values(contracts).map(c => (
          <div
            key={c.id}
            onClick={() => {
              setSelectedContract(c.id);
              setSelectedBridge(null);
              setActiveTab('docs');
            }}
            className={`absolute bg-white border rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-md transition-all ${selectedContract === c.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
            style={{ left: c.x, top: c.y, width: 130 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-900">{c.name}</span>
              <div className={`w-2 h-2 rounded-full ${statusColors[c.status]}`}></div>
            </div>
            <div className="text-xs text-gray-500 font-light">{c.version}</div>
            <div className="text-xs text-gray-500 font-light">Gas: {c.gas}</div>
          </div>
        ))}
      </div>

      {(selected || selectedBridgeObj || selectedContract === 'ipfs' || selectedContract === 'oppy') && (
        <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col z-50 relative">
          <div className="p-6 border-b border-gray-200">
            {selectedContract === 'oppy' && (
              <>
                <div className="flex items-center mb-2">
                  <MessageSquare className="w-6 h-6 text-green-600 mr-2" />
                  <h2 className="text-2xl font-light text-gray-900">Agent Oppy</h2>
                </div>
                <p className="text-sm text-gray-500 font-light">Your OpenWork assistant</p>
              </>
            )}

            {selected && (
              <>
                <h2 className="text-2xl font-light mb-1 text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500 font-light mb-4">{selected.docs}</p>
                
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      <span className="font-medium text-blue-900 text-xs uppercase tracking-wide">Mainnet</span>
                    </div>
                    <div className="font-light text-sm text-gray-800">{selected.mainnetNetwork}</div>
                    <div className="text-xs text-gray-600 font-light mt-1">Deployed: {selected.mainnetDeployed}</div>
                    {selected.mainnetAddress && (
                      <div className="text-xs font-mono bg-white px-2 py-1 rounded mt-2 break-all text-gray-600 font-light">
                        {selected.mainnetAddress}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                      <span className="font-medium text-blue-900 text-xs uppercase tracking-wide">Testnet</span>
                    </div>
                    <div className="font-light text-sm text-gray-800">{selected.testnetNetwork}</div>
                    <div className="text-xs text-gray-600 font-light mt-1">Deployed: {selected.testnetDeployed}</div>
                    {selected.testnetAddress && (
                      <div className="text-xs font-mono bg-white px-2 py-1 rounded mt-2 break-all text-gray-600 font-light">
                        {selected.testnetAddress}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {selectedContract === 'ipfs' && (
              <>
                <h2 className="text-2xl font-light mb-1 text-gray-900">IPFS Storage</h2>
                <p className="text-sm text-gray-500 font-light mb-4">{ipfsData.docs}</p>
                
                <div className="bg-pink-50 border border-pink-200 p-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Database className="w-4 h-4 text-pink-600 mr-2" />
                    <span className="font-medium text-pink-900 text-xs uppercase tracking-wide">IPFS Gateway</span>
                  </div>
                  <div className="text-xs font-mono bg-white px-2 py-1 rounded text-gray-600 font-light">
                    {ipfsData.gateway}
                  </div>
                </div>
              </>
            )}

            {selectedBridgeObj && (
              <>
                <h2 className="text-2xl font-light mb-1 text-gray-900">{selectedBridgeObj.name}</h2>
                <p className="text-sm text-gray-500 font-light mb-4">{selectedBridgeObj.docs}</p>
                
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-600 font-light">Protocol:</span>
                      <span className="font-medium text-gray-900">{selectedBridgeObj.protocol}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-600 font-light">Version:</span>
                      <span className="font-mono text-gray-900">{selectedBridgeObj.version}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 font-light">TVL:</span>
                      <span className="font-semibold text-green-600">{selectedBridgeObj.tvl}</span>
                    </div>
                  </div>

                  {selectedBridgeObj.mainnetAddress && (
                    <div className="bg-green-50 border border-green-100 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-green-800 mb-1">Mainnet Address:</div>
                      <div className="text-xs font-mono bg-white px-2 py-1 rounded break-all text-gray-600">
                        {selectedBridgeObj.mainnetAddress}
                      </div>
                    </div>
                  )}

                  {selectedBridgeObj.testnetAddress && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-blue-800 mb-1">Testnet Address:</div>
                      <div className="text-xs font-mono bg-white px-2 py-1 rounded break-all text-gray-600">
                        {selectedBridgeObj.testnetAddress}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {selectedContract === 'oppy' ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {oppyChat.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-50 border border-green-200 text-gray-800'}`}>
                      {msg.role === 'oppy' && (
                        <div className="flex items-center mb-1">
                          <MessageSquare className="w-3 h-3 mr-1 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">Oppy</span>
                        </div>
                      )}
                      <p className="text-sm font-light">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleOppySubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={oppyMessage}
                    onChange={(e) => setOppyMessage(e.target.value)}
                    placeholder="Ask me anything about OpenWork..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-light focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all flex items-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`flex-1 px-4 py-3 text-xs font-medium uppercase tracking-wide transition-all ${activeTab === 'docs' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Documentation
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 px-4 py-3 text-xs font-medium uppercase tracking-wide transition-all ${activeTab === 'code' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Code
                </button>
                {selected && (
                  <button
                    onClick={() => setActiveTab('deploy')}
                    className={`flex-1 px-4 py-3 text-xs font-medium uppercase tracking-wide transition-all ${activeTab === 'deploy' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Deploy
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-6">
                {activeTab === 'docs' && selectedContract === 'ipfs' && (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-gray-700 font-light leading-relaxed">{ipfsData.docs}</p>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">Usage Examples</h3>
                      {ipfsData.examples.map((example, idx) => (
                        <div key={idx} className="mb-4">
                          <button
                            onClick={() => toggleSection(`ipfs-${idx}`)}
                            className="w-full flex items-center justify-between p-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-all"
                          >
                            <span className="text-sm font-medium text-gray-900">{example.title}</span>
                            {expandedSections[`ipfs-${idx}`] ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                          </button>
                          {expandedSections[`ipfs-${idx}`] && (
                            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                              <p className="text-xs text-gray-600 font-light mb-3 leading-relaxed">{example.description}</p>
                              <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto border border-gray-200">
                                <code className="text-gray-800 font-mono">{example.code}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'docs' && selected && (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-gray-700 font-light leading-relaxed">{selected.docs}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'docs' && selectedBridgeObj && (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-gray-700 font-light leading-relaxed">{selectedBridgeObj.docs}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                    <Code className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-light">Contract code available in documentation</p>
                  </div>
                )}

                {activeTab === 'deploy' && selected && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Rocket className="w-4 h-4 text-blue-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">Deploy Contract</h3>
                      </div>
                      <p className="text-xs text-gray-600 font-light mb-4">Deploy this contract to your selected network.</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block uppercase tracking-wide">Select Network</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-light focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Ethereum Mainnet</option>
                          <option>Ethereum Sepolia</option>
                          <option>Base Mainnet</option>
                          <option>Base Sepolia</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block uppercase tracking-wide">Constructor Parameters</label>
                        <textarea
                          placeholder="Enter constructor arguments..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono font-light focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>

                      <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 font-light">Estimated Gas:</span>
                          <span className="font-medium text-gray-900">{selected.gas}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 font-light">Network Fee:</span>
                          <span className="font-medium text-gray-900">~$45.20</span>
                        </div>
                      </div>

                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium uppercase tracking-wide transition-all flex items-center justify-center">
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy Contract
                      </button>

                      <p className="text-xs text-gray-500 font-light text-center">Make sure your wallet is connected to the correct network</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OpenWorkBuilder;