import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Code, TestTube, Play, Database, History, ArrowRight, Edit2, Rocket, ChevronDown, ChevronRight, MessageSquare, Send, X, Copy, Check, Wallet, AlertCircle, ExternalLink, Workflow, Lock, Unlock } from 'lucide-react';
import './OpenworkDocs.css';
import { contractsData } from './data/contracts';
import { ipfsData } from './data/ipfsData';
import { columnPositions, statusColors } from './data/columnPositions';
import { arrowConnections } from './data/arrowConnections';
import { buildOppyContext, FALLBACK_RESPONSES } from './data/oppyKnowledge';
import flowsData from './data/flowsData';
import FlowVisualizer from '../../components/FlowVisualizer';
import UserFlowsOverview from '../../components/UserFlowsOverview';
import AdminLogin from '../../components/AdminLogin';
import Web3 from 'web3';

// Gemini API Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const OpenworkDocs = () => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [editingStatus, setEditingStatus] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);
  const [oppyMessage, setOppyMessage] = useState('');
  const [oppyChat, setOppyChat] = useState([
    { role: 'oppy', text: `Hi! I'm Agent Oppy, your OpenWork assistant powered by Gemini AI. Ask me anything about the protocol, contracts, or how to get started!${GEMINI_API_KEY ? ' ✅ AI Ready' : ' ⚠️ API Key Missing'}` }
  ]);
  const [copiedCode, setCopiedCode] = useState(null);
  const chatMessagesRef = React.useRef(null);
  
  // Deployment state
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [deployParams, setDeployParams] = useState({});
  const [deployStatus, setDeployStatus] = useState('idle'); // idle, deploying, success, error
  const [deployedAddress, setDeployedAddress] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [deployReceipt, setDeployReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Deployment history state
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState(null);
  
  // Editing state
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [isEditingAdvanced, setIsEditingAdvanced] = useState(false);
  const [editedDocs, setEditedDocs] = useState('');
  const [editedCode, setEditedCode] = useState('');
  const [editedProxyCode, setEditedProxyCode] = useState('');
  const [editedFullData, setEditedFullData] = useState('');
  const [customDocs, setCustomDocs] = useState({});

  const handleCopyCode = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Load deployment history for a contract
  const loadDeploymentHistory = async (contractId) => {
    if (!contractId) return;
    
    try {
      setLoadingHistory(true);
      setBackendError(null);
      
      // Use registry endpoint to get all fields including is_current
      const response = await fetch(`http://localhost:3001/api/registry/${contractId}/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 404) {
        // No history for this contract yet - not an error
        setDeploymentHistory([]);
        setBackendError(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDeploymentHistory(data.history || []);
      } else {
        setDeploymentHistory([]);
      }
    } catch (error) {
      console.error('Error loading deployment history:', error);
      // Only show error for actual connection issues, not missing history
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        setBackendError('Backend server not available. Deploy history will not be shown.');
      }
      setDeploymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save deployment to backend
  const saveDeployment = async (contractId, contractName, address, txHash) => {
    try {
      const response = await fetch('http://localhost:3001/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          contractName,
          address,
          networkName: currentNetwork.name,
          chainId: currentNetwork.chainId,
          deployerAddress: account,
          transactionHash: txHash || null,
          constructorParams: deployParams
        })
      });
      
      if (response.ok) {
        console.log('✅ Deployment saved to history');
        // Reload history after save
        await loadDeploymentHistory(contractId);
      }
    } catch (error) {
      console.error('Error saving deployment:', error);
      // Don't fail the deployment if history save fails
    }
  };

  // Check admin session on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const username = localStorage.getItem('adminUsername');
    if (token && username) {
      // Verify token is still valid
      fetch('http://localhost:3001/api/admin/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setIsAdmin(true);
          setAdminToken(token);
          setAdminUsername(username);
        } else {
          // Token expired
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
        }
      })
      .catch(() => {
        // Backend not available
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
      });
    }
  }, []);

  // Load custom docs when contract changes
  useEffect(() => {
    if (selectedContract && selectedContract !== 'ipfs' && selectedContract !== 'oppy' && selectedContract !== 'flows') {
      fetch(`http://localhost:3001/api/admin/contracts/${selectedContract}/docs`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.docs) {
            setCustomDocs(prev => ({
              ...prev,
              [selectedContract]: data.docs
            }));
          }
        })
        .catch(err => console.error('Error loading custom docs:', err));
    }
  }, [selectedContract]);

  // Load history when switching to Deploy tab (no wallet needed to view history)
  useEffect(() => {
    if (selectedContract && selectedContract !== 'ipfs' && selectedContract !== 'oppy' && selectedContract !== 'flows' && activeTab === 'deploy') {
      loadDeploymentHistory(selectedContract);
    }
  }, [selectedContract, activeTab]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [oppyChat]);

  // Auto-layout: Calculate x,y positions from column and order
  const contracts = useMemo(() => {
    const startY = 240;
    const verticalGap = 110;
    
    const positioned = {};
    Object.entries(contractsData).forEach(([key, contract]) => {
      positioned[key] = {
        ...contract,
        x: columnPositions[contract.column],
        y: startY + (contract.order * verticalGap)
      };
    });
    
    return positioned;
  }, []);

  const selected = selectedContract && selectedContract !== 'ipfs' && selectedContract !== 'oppy' ? contracts[selectedContract] : null;

  // Generate arrow paths
  const generateArrowPath = (fromId, toId, routeType = 'direct') => {
    const from = contracts[fromId];
    const to = contracts[toId];
    
    if (!from || !to) return null;
    
    const cardWidth = 130;
    const cardHeight = 80;
    const arrowMarkerWidth = 10; // Width of arrow marker + buffer for stroke
    
    // Calculate connection points, adjusted for arrow marker size
    const fromX = from.x + cardWidth + arrowMarkerWidth; // Right edge of 'from' card plus arrow width
    const fromY = from.y + cardHeight / 2; // Vertical center
    const toX = to.x - arrowMarkerWidth; // Left edge of 'to' card minus arrow width
    const toY = to.y + cardHeight / 2; // Vertical center
    
    // For direct routing (no obstacles)
    if (routeType === 'direct') {
      const controlPointOffset = Math.abs(toX - fromX) * 0.5;
      const controlPoint1X = fromX + controlPointOffset;
      const controlPoint2X = toX - controlPointOffset;
      
      return {
        path: `M ${fromX} ${fromY} C ${controlPoint1X} ${fromY}, ${controlPoint2X} ${toY}, ${toX} ${toY}`,
        fromX,
        fromY,
        toX,
        toY
      };
    }
    
    // For routing around obstacles
    const midX = (fromX + toX) / 2;
    const verticalOffset = 120; // How far to route above/below
    
    if (routeType === 'above') {
      // Route above: go up, across, then down
      const waypoint1Y = Math.min(fromY, toY) - verticalOffset;
      const waypoint2Y = waypoint1Y;
      
      // Create smooth S-curve with waypoints
      const controlOffset1 = 80;
      const controlOffset2 = 80;
      
      return {
        path: `M ${fromX} ${fromY} 
               C ${fromX + controlOffset1} ${fromY}, ${fromX + controlOffset1} ${waypoint1Y}, ${midX - 50} ${waypoint1Y}
               C ${midX + 50} ${waypoint2Y}, ${toX - controlOffset2} ${waypoint2Y}, ${toX - controlOffset2} ${toY}
               C ${toX - controlOffset2} ${toY}, ${toX} ${toY}, ${toX} ${toY}`,
        fromX,
        fromY,
        toX,
        toY
      };
    } else if (routeType === 'below') {
      // Route below: go down, across, then up
      const waypoint1Y = Math.max(fromY, toY) + verticalOffset;
      const waypoint2Y = waypoint1Y;
      
      const controlOffset1 = 80;
      const controlOffset2 = 80;
      
      return {
        path: `M ${fromX} ${fromY}
               C ${fromX + controlOffset1} ${fromY}, ${fromX + controlOffset1} ${waypoint1Y}, ${midX - 50} ${waypoint1Y}
               C ${midX + 50} ${waypoint2Y}, ${toX - controlOffset2} ${waypoint2Y}, ${toX - controlOffset2} ${toY}
               C ${toX - controlOffset2} ${toY}, ${toX} ${toY}, ${toX} ${toY}`,
        fromX,
        fromY,
        toX,
        toY
      };
    }
    
    // Fallback to direct
    return {
      path: `M ${fromX} ${fromY} L ${toX} ${toY}`,
      fromX,
      fromY,
      toX,
      toY
    };
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const contractsByChain = useMemo(() => {
    const base = Object.values(contracts).filter(c => c.chain === 'base');
    const l2 = Object.values(contracts).filter(c => c.chain === 'l2');
    const op = Object.values(contracts).filter(c => c.chain === 'op');
    const eth = Object.values(contracts).filter(c => c.chain === 'eth');
    
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
      base: { contracts: base, bounds: getBounds(base) },
      l2: { contracts: l2, bounds: getBounds(l2) },
      op: { contracts: op, bounds: getBounds(op) },
      eth: { contracts: eth, bounds: getBounds(eth) }
    };
  }, [contracts]);

  const handleOppySubmit = async (e) => {
    e.preventDefault();
    if (!oppyMessage.trim()) return;

    const userMsg = oppyMessage;
    setOppyChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setOppyMessage('');

    // Add a temporary "thinking" message
    setOppyChat(prev => [...prev, { role: 'oppy', text: '🤔 Thinking...', isThinking: true }]);

    try {
      // Build intelligent context based on user query
      const systemContext = buildOppyContext(userMsg);
      
      console.log('📚 Loaded context for query:', userMsg.substring(0, 50) + '...');
      console.log('🔑 API Key present:', GEMINI_API_KEY ? 'Yes' : 'No');
      console.log('🌐 API URL:', GEMINI_API_URL.substring(0, 80) + '...');

      // Call Gemini API
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemContext}\n\nUser Question: ${userMsg}\n\nProvide a helpful, accurate, and concise answer based on the OpenWork documentation above. Be technical when needed but also explain concepts clearly. If suggesting code, use proper formatting.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            topP: 0.95,
            topK: 40
          }
        })
      });

      console.log('📡 Gemini API response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Gemini API error response:', errorBody);
        throw new Error(`Gemini API error: ${response.status} - ${errorBody.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log('✅ Gemini API response received');
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

      // Remove thinking message and add actual response
      setOppyChat(prev => {
        const withoutThinking = prev.filter(msg => !msg.isThinking);
        return [...withoutThinking, { role: 'oppy', text: aiResponse }];
      });

    } catch (error) {
      console.error('❌ Gemini API error:', error);
      console.error('❌ Error details:', error.message);
      
      // Intelligent fallback based on keywords
      let fallbackResponse = FALLBACK_RESPONSES.default;
      const lowerMsg = userMsg.toLowerCase();
      
      // Find best matching fallback
      for (const [keyword, response] of Object.entries(FALLBACK_RESPONSES)) {
        if (lowerMsg.includes(keyword)) {
          fallbackResponse = response;
          break;
        }
      }
      
      // Remove thinking message and add fallback response
      setOppyChat(prev => {
        const withoutThinking = prev.filter(msg => !msg.isThinking);
        return [...withoutThinking, { role: 'oppy', text: fallbackResponse }];
      });
    }
  };

  return (
    <div className="docs-container">
      <div className="docs-sidebar">
        <div className="docs-sidebar-content">
          <div>
            <div 
              onClick={() => {
                setSelectedContract('flows');
                setActiveTab('docs');
              }}
              className={`docs-sidebar-item docs-sidebar-item-flows ${selectedContract === 'flows' ? 'docs-sidebar-item-flows-active' : ''}`}
            >
              <div className="docs-sidebar-item-content">
                <Workflow className="docs-sidebar-item-icon" />
                <span className="docs-sidebar-item-text">Function Flows</span>
              </div>
            </div>
          </div>

          <div>
            <div 
              onClick={() => {
                setSelectedContract('oppy');
                setActiveTab('docs');
              }}
              className={`docs-sidebar-item docs-sidebar-item-oppy ${selectedContract === 'oppy' ? 'docs-sidebar-item-oppy-active' : ''}`}
            >
              <div className="docs-sidebar-item-content">
                <MessageSquare className="docs-sidebar-item-icon" />
                <span className="docs-sidebar-item-text">Agent Oppy</span>
              </div>
            </div>
          </div>

          <div className="docs-sidebar-section">
            <h3 className="docs-sidebar-section-title">Base Sepolia (Main Chain)</h3>
            {contractsByChain.base.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setActiveTab('docs');
                }}
                className={`docs-sidebar-item ${selectedContract === c.id ? 'docs-sidebar-item-active' : ''}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div className="docs-sidebar-section">
            <h3 className="docs-sidebar-section-title">Arbitrum Sepolia (Native Chain)</h3>
            {contractsByChain.l2.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setActiveTab('docs');
                }}
                className={`docs-sidebar-item ${selectedContract === c.id ? 'docs-sidebar-item-active' : ''}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div className="docs-sidebar-section">
            <h3 className="docs-sidebar-section-title">OP Sepolia</h3>
            {contractsByChain.op.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setActiveTab('docs');
                }}
                className={`docs-sidebar-item ${selectedContract === c.id ? 'docs-sidebar-item-active' : ''}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div className="docs-sidebar-section">
            <h3 className="docs-sidebar-section-title">Ethereum Sepolia</h3>
            {contractsByChain.eth.contracts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setSelectedContract(c.id);
                  setActiveTab('docs');
                }}
                className={`docs-sidebar-item ${selectedContract === c.id ? 'docs-sidebar-item-active' : ''}`}
              >
                {c.name}
              </div>
            ))}
          </div>

          <div>
            <div 
              onClick={() => {
                setSelectedContract('ipfs');
                setActiveTab('docs');
              }}
              className={`docs-sidebar-item docs-sidebar-item-ipfs ${selectedContract === 'ipfs' ? 'docs-sidebar-item-ipfs-active' : ''}`}
            >
              <div className="docs-sidebar-item-content">
                <Database className="docs-sidebar-item-icon" />
                IPFS Storage
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="docs-canvas">
        <div className="docs-canvas-gradient"></div>
        
        {/* SVG Arrow Layer */}
        <svg className="docs-svg-canvas">
          <defs>
            {/* Arrow marker for end of path */}
            <marker
              id="arrowhead-end"
              viewBox="0 0 10 10"
              refX="0"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L0,10 L10,5 z" fill="#9333ea" />
            </marker>
            {/* Arrow marker for start of path (bidirectional) */}
            <marker
              id="arrowhead-start"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M10,0 L10,10 L0,5 z" fill="#9333ea" />
            </marker>
          </defs>
          
          {/* Render arrows */}
          {arrowConnections.map((connection) => {
            const arrowData = generateArrowPath(connection.from, connection.to, connection.routeType || 'direct');
            if (!arrowData) return null;
            
            return (
              <g key={connection.id}>
                {/* Arrow path */}
                <path
                  d={arrowData.path}
                  stroke={connection.color}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={connection.type === 'bidirectional' || connection.type === 'forward' ? 'url(#arrowhead-end)' : ''}
                  markerStart={connection.type === 'bidirectional' ? 'url(#arrowhead-start)' : ''}
                  opacity="0.7"
                />
                {/* Optional label */}
                {connection.label && (
                  <text
                    x={(arrowData.fromX + arrowData.toX) / 2}
                    y={(arrowData.fromY + arrowData.toY) / 2 - 10}
                    fill={connection.color}
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {connection.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        
        <div 
          className="docs-ipfs-card" 
          style={{ left: 50, top: 50, width: 140 }}
          onClick={() => {
            setSelectedContract('ipfs');
            setActiveTab('docs');
          }}
        >
          <div className="docs-ipfs-card-header">
            <Database className="docs-ipfs-card-icon" />
            IPFS
          </div>
          <div className="docs-ipfs-card-content">
            <div className="docs-ipfs-card-item">Job Descriptions</div>
            <div className="docs-ipfs-card-item">Submissions</div>
            <div className="docs-ipfs-card-item">Evidence</div>
          </div>
        </div>

        {contractsByChain.base.bounds.width > 0 && (
          <>
            <div 
              className="docs-network-zone" 
              style={{ 
                left: contractsByChain.base.bounds.minX, 
                top: contractsByChain.base.bounds.minY, 
                width: contractsByChain.base.bounds.width, 
                height: contractsByChain.base.bounds.height 
              }}
            ></div>
            <div 
              className="docs-network-label" 
              style={{ left: contractsByChain.base.bounds.minX + 10, top: contractsByChain.base.bounds.minY - 25 }}
            >
              Base Sepolia (Main Chain)
            </div>
          </>
        )}

        {contractsByChain.l2.bounds.width > 0 && (
          <>
            <div 
              className="docs-network-zone docs-network-zone-l2" 
              style={{ 
                left: contractsByChain.l2.bounds.minX, 
                top: contractsByChain.l2.bounds.minY, 
                width: contractsByChain.l2.bounds.width, 
                height: contractsByChain.l2.bounds.height 
              }}
            ></div>
            <div 
              className="docs-network-label" 
              style={{ left: contractsByChain.l2.bounds.minX + 10, top: contractsByChain.l2.bounds.minY - 25 }}
            >
              Arbitrum Sepolia (Native Chain)
            </div>
          </>
        )}

        {contractsByChain.op.bounds.width > 0 && (
          <>
            <div 
              className="docs-network-zone docs-network-zone-user" 
              style={{ 
                left: contractsByChain.op.bounds.minX, 
                top: contractsByChain.op.bounds.minY, 
                width: contractsByChain.op.bounds.width, 
                height: contractsByChain.op.bounds.height 
              }}
            ></div>
            <div 
              className="docs-network-label" 
              style={{ left: contractsByChain.op.bounds.minX + 10, top: contractsByChain.op.bounds.minY - 25 }}
            >
              OP Sepolia
            </div>
          </>
        )}

        {contractsByChain.eth.bounds.width > 0 && (
          <>
            <div 
              className="docs-network-zone docs-network-zone-user" 
              style={{ 
                left: contractsByChain.eth.bounds.minX, 
                top: contractsByChain.eth.bounds.minY, 
                width: contractsByChain.eth.bounds.width, 
                height: contractsByChain.eth.bounds.height 
              }}
            ></div>
            <div 
              className="docs-network-label" 
              style={{ left: contractsByChain.eth.bounds.minX + 10, top: contractsByChain.eth.bounds.minY - 25 }}
            >
              Ethereum Sepolia
            </div>
          </>
        )}

        {Object.values(contracts).map(c => (
          <div
            key={c.id}
            onClick={() => {
              setSelectedContract(c.id);
              setActiveTab('docs');
            }}
            className={`docs-contract-card ${selectedContract === c.id ? 'docs-contract-card-active' : ''}`}
            style={{ left: c.x, top: c.y, width: 130, height: 80 }}
          >
            <div className="docs-contract-card-header">
              <span className="docs-contract-card-name">{c.name}</span>
              {c.isUUPS && (
                <span className="docs-contract-uups-badge">UUPS</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {(selected || selectedContract === 'ipfs' || selectedContract === 'oppy' || selectedContract === 'flows') && (
        <div className="docs-details-panel">
          <button
            onClick={() => {
              setSelectedContract(null);
            }}
            className="docs-details-close-button"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
          <div className="docs-details-header">
            {selectedContract === 'flows' && (
              <>
                <div className="docs-details-header-flows">
                  <Workflow className="docs-details-header-icon" />
                  <h2 className="docs-details-title">Function Flows</h2>
                </div>
                <p className="docs-details-subtitle">Interactive visualization of key contract functions</p>
              </>
            )}

            {selectedContract === 'oppy' && (
              <>
                <div className="docs-details-header-oppy">
                  <MessageSquare className="docs-details-header-icon" />
                  <h2 className="docs-details-title">Agent Oppy</h2>
                </div>
                <p className="docs-details-subtitle">Your OpenWork assistant</p>
              </>
            )}

            {selected && (
              <>
                <div className="docs-details-title-row">
                  <h2 className="docs-details-title">{selected.name}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isAdmin ? (
                      <button
                        onClick={() => setShowAdminLogin(true)}
                        className="docs-network-toggle-button"
                        style={{ background: '#f59e0b', color: 'white' }}
                      >
                        <Lock size={16} />
                        Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          localStorage.removeItem('adminToken');
                          localStorage.removeItem('adminUsername');
                          setIsAdmin(false);
                          setAdminToken(null);
                          setAdminUsername(null);
                        }}
                        className="docs-network-toggle-button"
                        style={{ background: '#10b981', color: 'white' }}
                      >
                        <Unlock size={16} />
                        {adminUsername}
                      </button>
                    )}
                    <button
                      onClick={() => setShowNetworkDetails(!showNetworkDetails)}
                      className="docs-network-toggle-button"
                    >
                      {showNetworkDetails ? 'Hide Details' : 'Show Network Details'}
                      {showNetworkDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>
                <p className="docs-details-description">{selected.docs}</p>
                
                {showNetworkDetails && <div className="docs-network-cards">
                  <div className="docs-network-card">
                    <div className="docs-network-card-header">
                      <div className="docs-network-card-indicator"></div>
                      <span className="docs-network-card-label">Mainnet</span>
                    </div>
                    <div className="docs-network-card-name">{selected.mainnetNetwork}</div>
                    <div className="docs-network-card-deployed">Deployed: {selected.mainnetDeployed}</div>
                    {selected.mainnetAddress && (
                      <div className="docs-network-card-address">
                        {selected.mainnetAddress}
                      </div>
                    )}
                  </div>

                  <div className="docs-network-card">
                    <div className="docs-network-card-header">
                      <div className="docs-network-card-indicator docs-network-card-indicator-testnet"></div>
                      <span className="docs-network-card-label">Testnet{selected.isUUPS ? ' (UUPS Proxy)' : ''}</span>
                    </div>
                    <div className="docs-network-card-name">{selected.testnetNetwork}</div>
                    <div className="docs-network-card-deployed">Deployed: {selected.testnetDeployed}</div>
                    {selected.testnetAddress && (
                      <>
                        <div className="docs-network-card-address">
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                            {selected.isUUPS ? 'Proxy Address:' : 'Contract Address:'}
                          </div>
                          {selected.testnetAddress}
                        </div>
                        {selected.isUUPS && selected.implementationAddress && (
                          <div className="docs-network-card-address" style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                              Implementation:
                            </div>
                            {selected.implementationAddress}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>}
              </>
            )}

            {selectedContract === 'ipfs' && (
              <>
                <h2 className="docs-details-title">IPFS Storage</h2>
                <p className="docs-details-description">{ipfsData.docs}</p>
                
                <div className="docs-ipfs-details">
                  <div className="docs-ipfs-details-header">
                    <Database className="docs-ipfs-details-icon" />
                    <span className="docs-ipfs-details-label">IPFS Gateway</span>
                  </div>
                  <div className="docs-ipfs-details-gateway">
                    {ipfsData.gateway}
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedContract === 'flows' ? (
            <div className="docs-flows-container">
              <UserFlowsOverview onClose={() => setSelectedContract(null)} />
            </div>
          ) : selectedContract === 'oppy' ? (
            <div className="docs-chat-container">
              <div className="docs-chat-messages" ref={chatMessagesRef}>
                {oppyChat.map((msg, idx) => (
                  <div key={idx} className={`docs-chat-message ${msg.role === 'user' ? 'docs-chat-message-user' : 'docs-chat-message-oppy'}`}>
                    <div className={`docs-chat-bubble ${msg.role === 'user' ? 'docs-chat-bubble-user' : 'docs-chat-bubble-oppy'}`}>
                      {msg.role === 'oppy' && (
                        <div className="docs-chat-bubble-header">
                          <MessageSquare className="docs-chat-bubble-icon" />
                          <span className="docs-chat-bubble-name">Oppy</span>
                        </div>
                      )}
                      <p className="docs-chat-bubble-text">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="docs-chat-input-container">
                <form onSubmit={handleOppySubmit} className="docs-chat-form">
                  <input
                    type="text"
                    value={oppyMessage}
                    onChange={(e) => setOppyMessage(e.target.value)}
                    placeholder="Ask me anything about OpenWork..."
                    className="docs-chat-input"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="docs-chat-submit"
                    disabled={!oppyMessage.trim()}
                  >
                    <Send className="docs-chat-submit-icon" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div className="docs-tabs">
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`docs-tab ${activeTab === 'docs' ? 'docs-tab-active' : ''}`}
                >
                  Documentation
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`docs-tab ${activeTab === 'code' ? 'docs-tab-active' : ''}`}
                >
                  Code
                </button>
                {selected && (
                  <button
                    onClick={() => setActiveTab('deploy')}
                    className={`docs-tab ${activeTab === 'deploy' ? 'docs-tab-active' : ''}`}
                  >
                    Deploy
                  </button>
                )}
              </div>

              <div className="docs-tab-content">
                {activeTab === 'docs' && selectedContract === 'ipfs' && (
                  <div>
                    <div className="docs-prose">
                      <p>{ipfsData.docs}</p>
                    </div>

                    {/* IPFS Hash Structures Section */}
                    <div className="docs-section">
                      <h3 className="docs-section-title">📦 IPFS Hash Structures</h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                        Exact data structures stored in IPFS (extracted from production code)
                      </p>
                      
                      {ipfsData.hashStructures.map((hashStruct, idx) => (
                        <div key={idx} className="docs-function-item" style={{ marginBottom: '16px' }}>
                          <button
                            onClick={() => toggleSection(`hash-${idx}`)}
                            className="docs-function-toggle"
                          >
                            <span className="docs-function-name">{hashStruct.name}</span>
                            {expandedSections[`hash-${idx}`] ? 
                              <ChevronDown className="docs-function-icon" /> : 
                              <ChevronRight className="docs-function-icon" />
                            }
                          </button>
                          
                          {expandedSections[`hash-${idx}`] && (
                            <div className="docs-function-content">
                              <p className="docs-function-text" style={{ marginBottom: '12px' }}>
                                {hashStruct.description}
                              </p>
                              
                              <div className="docs-function-section">
                                <h5 className="docs-function-section-title">Used in:</h5>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {hashStruct.usedIn.map((func, funcIdx) => (
                                    <span key={funcIdx} className="docs-related-tag">
                                      {func}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="docs-function-section">
                                <h5 className="docs-function-section-title">Structure:</h5>
                                <div className="docs-params-list">
                                  {Object.entries(hashStruct.structure).map(([key, value], paramIdx) => (
                                    <div key={paramIdx} className="docs-param-item">
                                      <div className="docs-param-header">
                                        <code className="docs-param-name">{key}</code>
                                      </div>
                                      <p className="docs-param-description">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="docs-function-section">
                                <h5 className="docs-function-section-title">Example JSON:</h5>
                                <pre className="docs-code-block" style={{ margin: 0 }}>
                                  <code>{hashStruct.example}</code>
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Best Practices Section */}
                    <div className="docs-section">
                      <h3 className="docs-section-title">💡 Best Practices</h3>
                      <ul className="docs-feature-list">
                        {ipfsData.bestPractices.map((practice, idx) => (
                          <li key={idx} className="docs-feature-item">{practice}</li>
                        ))}
                      </ul>
                    </div>

                    {/* IPFS Gateways Section */}
                    <div className="docs-section">
                      <h3 className="docs-section-title">🌐 IPFS Gateways</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {ipfsData.gateways.map((gateway, idx) => (
                          <div key={idx} className="docs-dependency-card">
                            <div className="docs-dependency-header">
                              <span className="docs-dependency-name">{gateway.name}</span>
                              <span className="docs-dependency-badge">{gateway.reliability}</span>
                            </div>
                            <p className="docs-dependency-reason" style={{ fontSize: '11px', fontFamily: 'monospace', marginBottom: '4px' }}>
                              {gateway.url}
                            </p>
                            <p className="docs-dependency-reason" style={{ fontSize: '11px' }}>
                              Speed: {gateway.speed}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Code Examples Section */}
                    <div className="docs-section">
                      <h3 className="docs-section-title">💻 Code Examples</h3>
                      {ipfsData.examples.map((example, idx) => (
                        <div key={idx} className="docs-example-item">
                          <button
                            onClick={() => toggleSection(`ipfs-${idx}`)}
                            className="docs-example-button"
                          >
                            <span className="docs-example-button-title">{example.title}</span>
                            {expandedSections[`ipfs-${idx}`] ? <ChevronDown className="docs-example-button-icon" /> : <ChevronRight className="docs-example-button-icon" />}
                          </button>
                          {expandedSections[`ipfs-${idx}`] && (
                            <div className="docs-example-content">
                              <p className="docs-example-description">{example.description}</p>
                              <pre className="docs-example-code">
                                <code>{example.code}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'docs' && selected && (
                  <div className="docs-comprehensive">
                    {/* Admin Edit Buttons for Documentation */}
                    {isAdmin && !isEditingDocs && !isEditingAdvanced && (
                      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setIsEditingDocs(true);
                            setEditedDocs(customDocs[selectedContract]?.documentation || selected.docs);
                          }}
                          className="docs-deployment-set-current-btn"
                        >
                          <Edit2 size={14} style={{ marginRight: '6px' }} />
                          Quick Edit
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingAdvanced(true);
                            const fullContract = customDocs[selectedContract]?.full_data 
                              ? JSON.parse(customDocs[selectedContract].full_data)
                              : selected;
                            setEditedFullData(JSON.stringify(fullContract, null, 2));
                          }}
                          className="docs-network-toggle-button"
                          style={{ background: '#7c3aed', color: 'white' }}
                        >
                          <Code size={14} style={{ marginRight: '6px' }} />
                          Advanced Edit (JSON)
                        </button>
                      </div>
                    )}

                    {/* Advanced JSON Editor */}
                    {isEditingAdvanced && (
                      <div className="docs-section">
                        <div style={{ marginBottom: '12px', background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde047' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                            ⚡ <strong>Advanced Mode:</strong> Edit the complete contract data as JSON. This allows editing all sections including features, functions, dependencies, etc.
                          </p>
                        </div>
                        <textarea
                          value={editedFullData}
                          onChange={(e) => setEditedFullData(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '500px',
                            padding: '12px',
                            border: '2px solid #7c3aed',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontFamily: 'Courier New, monospace',
                            lineHeight: '1.6',
                            marginBottom: '12px',
                            background: '#0f172a',
                            color: '#94a3b8'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              try {
                                // Validate JSON
                                const parsedData = JSON.parse(editedFullData);
                                
                                const response = await fetch(`http://localhost:3001/api/admin/contracts/${selectedContract}/docs`, {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${adminToken}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    contractId: selectedContract,
                                    contractName: selected.name,
                                    fullData: parsedData
                                  })
                                });

                                const data = await response.json();
                                if (data.success) {
                                  setCustomDocs(prev => ({
                                    ...prev,
                                    [selectedContract]: { 
                                      ...prev[selectedContract], 
                                      full_data: JSON.stringify(parsedData)
                                    }
                                  }));
                                  setIsEditingAdvanced(false);
                                  alert('✅ Full contract data saved! Please reload the page to see changes.');
                                  window.location.reload();
                                } else {
                                  alert('Failed to save: ' + data.error);
                                }
                              } catch (error) {
                                if (error instanceof SyntaxError) {
                                  alert('❌ Invalid JSON: ' + error.message);
                                } else {
                                  alert('Error: ' + error.message);
                                }
                              }
                            }}
                            className="docs-deployment-set-current-btn"
                          >
                            <Check size={14} style={{ marginRight: '6px' }} />
                            Save & Reload
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingAdvanced(false);
                              setEditedFullData('');
                            }}
                            className="docs-network-toggle-button"
                          >
                            <X size={14} style={{ marginRight: '6px' }} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Editing Mode for Documentation */}
                    {isEditingDocs ? (
                      <div className="docs-section">
                        <div style={{ marginBottom: '12px', background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde047' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                            ✏️ <strong>Editing Mode:</strong> Edit the documentation text below. Changes will be saved to the database.
                          </p>
                        </div>
                        <textarea
                          value={editedDocs}
                          onChange={(e) => setEditedDocs(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '12px',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'Satoshi, sans-serif',
                            lineHeight: '1.7',
                            marginBottom: '12px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`http://localhost:3001/api/admin/contracts/${selectedContract}/docs`, {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${adminToken}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    contractId: selectedContract,
                                    contractName: selected.name,
                                    documentation: editedDocs
                                  })
                                });

                                const data = await response.json();
                                if (data.success) {
                                  setCustomDocs(prev => ({
                                    ...prev,
                                    [selectedContract]: { ...prev[selectedContract], documentation: editedDocs }
                                  }));
                                  setIsEditingDocs(false);
                                  alert('✅ Documentation saved successfully!');
                                } else {
                                  alert('Failed to save: ' + data.error);
                                }
                              } catch (error) {
                                alert('Error: ' + error.message);
                              }
                            }}
                            className="docs-deployment-set-current-btn"
                          >
                            <Check size={14} style={{ marginRight: '6px' }} />
                            Save Changes
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingDocs(false);
                              setEditedDocs('');
                            }}
                            className="docs-network-toggle-button"
                          >
                            <X size={14} style={{ marginRight: '6px' }} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="docs-section">
                        <p className="docs-brief-description">
                          {customDocs[selectedContract]?.documentation || selected.docs}
                        </p>
                      </div>
                    )}

                    {/* Overview Section */}
                    {selected.overview && (
                      <div className="docs-section">
                        <h3 className="docs-section-title">📋 Overview</h3>
                        <div className="docs-section-content">
                          <p className="docs-overview-purpose">{selected.overview.purpose}</p>
                          <div className="docs-meta-grid">
                            <div className="docs-meta-item">
                              <span className="docs-meta-label">Tier:</span>
                              <span className="docs-meta-value">{selected.overview.tier}</span>
                            </div>
                            <div className="docs-meta-item">
                              <span className="docs-meta-label">Category:</span>
                              <span className="docs-meta-value">{selected.overview.category}</span>
                            </div>
                            <div className="docs-meta-item">
                              <span className="docs-meta-label">Upgradeability:</span>
                              <span className="docs-meta-value">{selected.overview.upgradeability}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key Features Section */}
                    {selected.features && (
                      <div className="docs-section">
                        <h3 className="docs-section-title">✨ Key Features</h3>
                        <ul className="docs-feature-list">
                          {selected.features.map((feature, idx) => (
                            <li key={idx} className="docs-feature-item">{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* System Position Section */}
                    {selected.systemPosition && (
                      <div className="docs-section">
                        <h3 className="docs-section-title">🏗️ System Architecture</h3>
                        <div className="docs-section-content">
                          <p className="docs-architecture-description">{selected.systemPosition.description}</p>
                          <pre className="docs-diagram">
                            <code>{selected.systemPosition.diagram}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Dependencies Section */}
                    {selected.dependencies && (
                      <div className="docs-section">
                        <h3 className="docs-section-title">🔗 Dependencies & Prerequisites</h3>
                        <div className="docs-dependencies-container">
                          <div className="docs-dependency-column">
                            <h4 className="docs-dependency-subtitle">Depends On</h4>
                            {selected.dependencies.dependsOn.map((dep, idx) => (
                              <div key={idx} className="docs-dependency-card">
                                <div className="docs-dependency-header">
                                  <span className="docs-dependency-name">{dep.name}</span>
                                  <span className="docs-dependency-badge">{dep.type}</span>
                                </div>
                                <p className="docs-dependency-reason">{dep.reason}</p>
                              </div>
                            ))}
                          </div>
                          <div className="docs-dependency-column">
                            <h4 className="docs-dependency-subtitle">Required By</h4>
                            {selected.dependencies.requiredBy.map((dep, idx) => (
                              <div key={idx} className="docs-dependency-card">
                                <div className="docs-dependency-header">
                                  <span className="docs-dependency-name">{dep.name}</span>
                                  <span className="docs-dependency-badge">{dep.type}</span>
                                </div>
                                <p className="docs-dependency-reason">{dep.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="docs-prerequisites">
                          <h4 className="docs-dependency-subtitle">Prerequisites</h4>
                          <ul className="docs-prerequisites-list">
                            {selected.dependencies.prerequisites.map((prereq, idx) => (
                              <li key={idx} className="docs-prerequisite-item">{prereq}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Core Functions Section */}
                    {selected.functions && (
                      <div className="docs-section">
                        <h3 className="docs-section-title">⚡ Core Functions</h3>
                        {selected.functions.map((category, catIdx) => (
                          <div key={catIdx} className="docs-function-category">
                            <div className="docs-function-category-header">
                              <h4 className="docs-function-category-title">{category.category}</h4>
                              <p className="docs-function-category-description">{category.description}</p>
                            </div>
                            {category.items.map((fn, fnIdx) => {
                              const sectionKey = `fn-${catIdx}-${fnIdx}`;
                              return (
                                <div key={fnIdx} className="docs-function-item">
                                  <button
                                    onClick={() => toggleSection(sectionKey)}
                                    className="docs-function-toggle"
                                  >
                                    <span className="docs-function-name">{fn.name}()</span>
                                    {expandedSections[sectionKey] ? 
                                      <ChevronDown className="docs-function-icon" /> : 
                                      <ChevronRight className="docs-function-icon" />
                                    }
                                  </button>
                                  
                                  {expandedSections[sectionKey] && (
                                    <div className="docs-function-content">
                                      <div className="docs-function-signature">
                                        <code>{fn.signature}</code>
                                      </div>
                                      
                                      <div className="docs-function-section">
                                        <h5 className="docs-function-section-title">What it does:</h5>
                                        <p className="docs-function-text">{fn.whatItDoes}</p>
                                      </div>
                                      
                                      <div className="docs-function-section">
                                        <h5 className="docs-function-section-title">Why you'd use it:</h5>
                                        <p className="docs-function-text">{fn.whyUse}</p>
                                      </div>
                                      
                                      <div className="docs-function-section">
                                        <h5 className="docs-function-section-title">How it works:</h5>
                                        <ol className="docs-function-steps">
                                          {fn.howItWorks.map((step, stepIdx) => (
                                            <li key={stepIdx} className="docs-function-step">{step}</li>
                                          ))}
                                        </ol>
                                      </div>
                                      
                                      <div className="docs-function-section">
                                        <h5 className="docs-function-section-title">Parameters:</h5>
                                        <div className="docs-params-list">
                                          {fn.parameters.map((param, paramIdx) => (
                                            <div key={paramIdx} className="docs-param-item">
                                              <div className="docs-param-header">
                                                <code className="docs-param-name">{param.name}</code>
                                                <span className="docs-param-type">{param.type}</span>
                                              </div>
                                              <p className="docs-param-description">{param.description}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="docs-code-tab">
                    {isAdmin && selected && !isEditingCode && (
                      <div className="docs-code-header">
                        <div></div>
                        <button
                          onClick={() => {
                            setIsEditingCode(true);
                            setEditedCode(customDocs[selectedContract]?.contract_code || selected.code);
                            setEditedProxyCode(customDocs[selectedContract]?.proxy_code || selected.proxyCode || '');
                          }}
                          className="docs-deployment-set-current-btn"
                        >
                          <Edit2 size={14} style={{ marginRight: '6px' }} />
                          Edit Code
                        </button>
                      </div>
                    )}

                    {isEditingCode ? (
                      <div style={{ padding: '24px' }}>
                        <div style={{ marginBottom: '16px', background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde047' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                            ✏️ <strong>Editing Mode:</strong> Edit the contract code below. Changes will be saved to the database.
                          </p>
                        </div>
                        <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                          {selected.isUUPS ? 'Implementation Contract' : 'Contract Code'}
                        </h4>
                        <textarea
                          value={editedCode}
                          onChange={(e) => setEditedCode(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '300px',
                            padding: '12px',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontFamily: 'Courier New, monospace',
                            lineHeight: '1.6',
                            marginBottom: '16px',
                            background: '#0f172a',
                            color: '#94a3b8'
                          }}
                        />
                        {selected.isUUPS && (
                          <>
                            <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Proxy Contract</h4>
                            <textarea
                              value={editedProxyCode}
                              onChange={(e) => setEditedProxyCode(e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: '200px',
                                padding: '12px',
                                border: '2px solid #3b82f6',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontFamily: 'Courier New, monospace',
                                lineHeight: '1.6',
                                marginBottom: '16px',
                                background: '#0f172a',
                                color: '#94a3b8'
                              }}
                            />
                          </>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`http://localhost:3001/api/admin/contracts/${selectedContract}/docs`, {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${adminToken}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    contractId: selectedContract,
                                    contractName: selected.name,
                                    contractCode: editedCode,
                                    proxyCode: editedProxyCode
                                  })
                                });

                                const data = await response.json();
                                if (data.success) {
                                  setCustomDocs(prev => ({
                                    ...prev,
                                    [selectedContract]: { 
                                      ...prev[selectedContract], 
                                      contract_code: editedCode,
                                      proxy_code: editedProxyCode
                                    }
                                  }));
                                  setIsEditingCode(false);
                                  alert('✅ Code saved successfully!');
                                } else {
                                  alert('Failed to save: ' + data.error);
                                }
                              } catch (error) {
                                alert('Error: ' + error.message);
                              }
                            }}
                            className="docs-deployment-set-current-btn"
                          >
                            <Check size={14} style={{ marginRight: '6px' }} />
                            Save Changes
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingCode(false);
                              setEditedCode('');
                              setEditedProxyCode('');
                            }}
                            className="docs-network-toggle-button"
                          >
                            <X size={14} style={{ marginRight: '6px' }} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : selected && selected.code ? (
                      <div>
                        <div className="docs-code-header">
                          <h3 className="docs-code-section-title">
                            {selected.isUUPS ? 'Implementation Contract' : 'Contract Code'}
                          </h3>
                          <button
                            onClick={() => handleCopyCode(customDocs[selectedContract]?.contract_code || selected.code, 'main')}
                            className="docs-copy-button"
                          >
                            {copiedCode === 'main' ? (
                              <>
                                <Check size={16} />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={16} />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="docs-code-block">
                          <code>{customDocs[selectedContract]?.contract_code || selected.code}</code>
                        </pre>
                        
                        {selected.isUUPS && (customDocs[selectedContract]?.proxy_code || selected.proxyCode) && (
                          <>
                            <div className="docs-code-header" style={{ marginTop: '2rem' }}>
                              <h3 className="docs-code-section-title">
                                Proxy Contract
                              </h3>
                              <button
                                onClick={() => handleCopyCode(customDocs[selectedContract]?.proxy_code || selected.proxyCode, 'proxy')}
                                className="docs-copy-button"
                              >
                                {copiedCode === 'proxy' ? (
                                  <>
                                    <Check size={16} />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={16} />
                                    <span>Copy Code</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="docs-code-block">
                              <code>{customDocs[selectedContract]?.proxy_code || selected.proxyCode}</code>
                            </pre>
                          </>
                        )}
                      </div>
                    ) : selectedContract === 'ipfs' ? (
                      <div>
                        {ipfsData.examples.map((example, idx) => (
                          <div key={idx}>
                            <div className="docs-code-header">
                              <h3 className="docs-code-section-title">{example.title}</h3>
                              <button
                                onClick={() => handleCopyCode(example.code, `ipfs-${idx}`)}
                                className="docs-copy-button"
                              >
                                {copiedCode === `ipfs-${idx}` ? (
                                  <>
                                    <Check size={16} />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={16} />
                                    <span>Copy Code</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p style={{ 
                              padding: '0 24px', 
                              marginBottom: '16px', 
                              fontSize: '13px', 
                              color: '#6b7280' 
                            }}>
                              {example.description}
                            </p>
                            <pre className="docs-code-block">
                              <code>{example.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Contract code will be added soon...</p>
                    )}
                  </div>
                )}

                {activeTab === 'deploy' && selected && selected.deployConfig && (
                  <div className="docs-deploy-tab">
                    {/* Current Production Address */}
                    {selected.testnetAddress && (
                      <div style={{ 
                        background: '#f0fdf4', 
                        border: '2px solid #86efac', 
                        borderRadius: '12px', 
                        padding: '20px',
                        marginBottom: '24px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Check size={20} style={{ color: '#16a34a' }} />
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#166534' }}>
                            Current Production Deployment
                          </h3>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginBottom: '4px' }}>
                            {selected.isUUPS ? 'PROXY ADDRESS:' : 'CONTRACT ADDRESS:'}
                          </div>
                          <div style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '13px', 
                            color: '#14532d',
                            background: 'white',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0',
                            wordBreak: 'break-all'
                          }}>
                            {selected.testnetAddress}
                          </div>
                        </div>
                        {selected.isUUPS && selected.implementationAddress && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginBottom: '4px' }}>
                              IMPLEMENTATION:
                            </div>
                            <div style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '13px', 
                              color: '#14532d',
                              background: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #bbf7d0',
                              wordBreak: 'break-all'
                            }}>
                              {selected.implementationAddress}
                            </div>
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#15803d', 
                          marginTop: '12px',
                          fontStyle: 'italic'
                        }}>
                          Network: {selected.testnetNetwork}
                        </div>
                      </div>
                    )}
                    
                    {!account ? (
                      <div className="docs-deploy-connect">
                        <Wallet size={48} style={{ color: '#2563eb', marginBottom: '16px' }} />
                        <h3>Connect Your Wallet</h3>
                        <p>Connect your wallet to deploy {selected.name} on your current network</p>
                        <button 
                          onClick={async () => {
                            try {
                              if (window.ethereum) {
                                const web3Instance = new Web3(window.ethereum);
                                const accounts = await window.ethereum.request({ 
                                  method: 'eth_requestAccounts' 
                                });
                                
                                // Get network info
                                const chainId = await web3Instance.eth.getChainId();
                                
                                // Map common network names
                                const networkNames = {
                                  1: 'Ethereum Mainnet',
                                  5: 'Goerli Testnet',
                                  11155111: 'Sepolia Testnet',
                                  8453: 'Base Mainnet',
                                  84532: 'Base Sepolia',
                                  42161: 'Arbitrum One',
                                  421614: 'Arbitrum Sepolia',
                                  10: 'Optimism',
                                  420: 'Optimism Goerli',
                                  137: 'Polygon',
                                  80001: 'Mumbai Testnet'
                                };
                                
                                setCurrentNetwork({
                                  chainId: Number(chainId),
                                  name: networkNames[Number(chainId)] || `Chain ID ${chainId}`
                                });
                                
                                setWeb3(web3Instance);
                                setAccount(accounts[0]);
                                
                                // Initialize params with defaults
                                const params = {};
                                selected.deployConfig.constructor.forEach(param => {
                                  if (param.default === 'WALLET') {
                                    params[param.name] = accounts[0];
                                  } else if (param.name === 'chainId') {
                                    // Auto-populate chainId from connected network
                                    params[param.name] = Number(chainId).toString();
                                  }
                                });
                                setDeployParams(params);
                              } else {
                                alert('Please install MetaMask!');
                              }
                            } catch (error) {
                              console.error('Error connecting wallet:', error);
                              setErrorMessage('Failed to connect wallet');
                            }
                          }}
                          className="docs-deploy-connect-button"
                        >
                          <Wallet size={20} />
                          <span>Connect Wallet</span>
                        </button>
                      </div>
                    ) : deployStatus === 'success' ? (
                      <div className="docs-deploy-success">
                        <div className="docs-deploy-success-icon">
                          <Check size={48} />
                        </div>
                        <h3>Deployment Successful!</h3>
                        <p>{selected.deployConfig.postDeploy.message}</p>
                        
                        <div className="docs-deploy-result-card">
                          <div className="docs-deploy-result-row">
                            <span>Contract Address:</span>
                            <div className="docs-deploy-address">
                              {deployedAddress}
                              <button 
                                onClick={() => navigator.clipboard.writeText(deployedAddress)}
                                className="docs-deploy-copy-btn"
                              >
                                <Copy size={16} />
                              </button>
                              <a 
                                href={(() => {
                                  const explorers = {
                                    1: 'https://etherscan.io',
                                    5: 'https://goerli.etherscan.io',
                                    11155111: 'https://sepolia.etherscan.io',
                                    8453: 'https://basescan.org',
                                    84532: 'https://sepolia.basescan.org',
                                    42161: 'https://arbiscan.io',
                                    421614: 'https://sepolia.arbiscan.io',
                                    10: 'https://optimistic.etherscan.io',
                                    420: 'https://goerli-optimism.etherscan.io',
                                    137: 'https://polygonscan.com',
                                    80001: 'https://mumbai.polygonscan.com'
                                  };
                                  const explorerUrl = explorers[currentNetwork?.chainId] || 'https://etherscan.io';
                                  return `${explorerUrl}/address/${deployedAddress}`;
                                })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="docs-deploy-copy-btn"
                              >
                                <ExternalLink size={16} />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="docs-deploy-next-steps">
                          <h4>Next Steps:</h4>
                          <ul>
                            {selected.deployConfig.postDeploy.nextSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>

                        <button 
                          onClick={() => {
                            setDeployStatus('idle');
                            setDeployedAddress(null);
                            setTxHash(null);
                          }}
                          className="docs-deploy-button"
                        >
                          Deploy Another
                        </button>
                      </div>
                    ) : (
                      <div className="docs-deploy-form-container">
                        <div className="docs-deploy-header-section">
                          <h3>Deploy {selected.name}</h3>
                          <p>Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</p>
                        </div>

                        {currentNetwork && (
                          <div className="docs-deploy-network-info">
                            <div className="docs-deploy-network-info-row">
                              <span className="docs-deploy-network-label">Network:</span>
                              <span className="docs-deploy-network-value">{currentNetwork.name}</span>
                            </div>
                            <div className="docs-deploy-network-info-row">
                              <span className="docs-deploy-network-label">Chain ID:</span>
                              <span className="docs-deploy-network-value">{currentNetwork.chainId}</span>
                            </div>
                            <p className="docs-deploy-network-hint">
                              Contract will be deployed on your currently connected network. To change networks, switch in MetaMask.
                            </p>
                          </div>
                        )}

                        {!selected.deployConfig.type || selected.deployConfig.type !== 'uups' ? (
                          <div className="docs-deploy-params-section">
                            <h4>Constructor Parameters:</h4>
                            {selected.deployConfig.constructor.map((param, idx) => (
                              <div key={idx} className="docs-deploy-param">
                                <label>
                                  {param.name}
                                  <span className="docs-deploy-param-type">({param.type})</span>
                                </label>
                                <p className="docs-deploy-param-desc">{param.description}</p>
                                <input
                                  type="text"
                                  value={deployParams[param.name] || ''}
                                  onChange={(e) => setDeployParams(prev => ({
                                    ...prev,
                                    [param.name]: e.target.value
                                  }))}
                                  placeholder={param.placeholder || param.name}
                                  disabled={deployStatus === 'deploying'}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="docs-deploy-info" style={{ background: '#fef3c7', border: '1px solid #fde047', color: '#78350f' }}>
                            <AlertCircle size={16} />
                            <div>
                              <strong>UUPS Deployment:</strong> Implementation and Proxy deploy without parameters. 
                              After deployment, initialize the proxy manually on the block scanner.
                            </div>
                          </div>
                        )}

                        <div className="docs-deploy-info">
                          <AlertCircle size={16} />
                          <span>Estimated Gas: {selected.deployConfig.estimatedGas}</span>
                        </div>

                        {errorMessage && (
                          <div className="docs-deploy-error">
                            <AlertCircle size={16} />
                            <span>{errorMessage}</span>
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            try {
                              setDeployStatus('deploying');
                              setErrorMessage('');

                              // Map contract ID to compiler contract name
                              const contractNameMapping = {
                                'mainDAO': 'MainDAO',
                                'token': 'VotingToken',
                                'nowjc': 'NOWJC',
                                'nativeAthena': 'NativeAthena',
                                'nativeRewards': 'NativeRewards',
                                'nativeBridge': 'NativeBridge',
                                'mainRewards': 'MainRewards'
                              };

                              const compilerContractName = contractNameMapping[selected.id];
                              if (!compilerContractName) {
                                throw new Error(`No compiler mapping found for contract: ${selected.id}`);
                              }

                              // Check if this is a UUPS contract
                              const isUUPS = selected.deployConfig.type === 'uups';

                              // Validate constructor args (skip for UUPS - no params needed)
                              if (!isUUPS) {
                                const invalidParams = selected.deployConfig.constructor.filter(p => !deployParams[p.name]);
                                if (invalidParams.length > 0) {
                                  throw new Error(`Missing required parameters: ${invalidParams.map(p => p.name).join(', ')}`);
                                }
                              }

                              if (isUUPS) {
                                // ====== UUPS 2-STEP DEPLOYMENT ======
                                console.log('🔷 Deploying UUPS contract (2-step process)...');
                                
                                // Step 1: Compile implementation contract
                                console.log('📦 Step 1: Compiling implementation...');
                                const implCompileResponse = await fetch('http://localhost:3001/api/compile', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ contractName: compilerContractName })
                                });
                                
                                if (!implCompileResponse.ok) {
                                  const errorData = await implCompileResponse.json();
                                  throw new Error(`Implementation compilation failed: ${errorData.error || 'Unknown error'}`);
                                }
                                
                                const implArtifact = await implCompileResponse.json();
                                console.log('✅ Implementation compiled');
                                
                                // Step 2: Deploy implementation (NO constructor args)
                                console.log('🚀 Step 2: Deploying implementation...');
                                const implContract = new web3.eth.Contract(implArtifact.abi);
                                const implDeployTx = implContract.deploy({
                                  data: implArtifact.bytecode
                                  // NO arguments - UUPS implementation has no constructor params!
                                });

                                // Use fixed gas limit for large contracts to avoid estimation issues
                                let implGas;
                                try {
                                  implGas = await implDeployTx.estimateGas({ from: account });
                                  console.log('✅ Gas estimated:', implGas.toString());
                                } catch (gasError) {
                                  console.log('⚠️ Gas estimation failed, using fixed limit');
                                  // Use a high fixed gas limit for complex contracts like MainDAO
                                  implGas = BigInt(5000000); // 5M gas
                                }
                                
                                const implGasWithBuffer = implGas + (implGas * 20n / 100n);
                                console.log('🔧 Using gas limit:', implGasWithBuffer.toString());
                                
                                const deployedImpl = await implDeployTx.send({
                                  from: account,
                                  gas: implGasWithBuffer
                                });
                                
                                const implAddress = deployedImpl.options.address;
                                console.log('✅ Implementation deployed at:', implAddress);
                                
                                // Step 3: Compile proxy contract
                                console.log('📦 Step 3: Compiling proxy...');
                                const proxyCompileResponse = await fetch('http://localhost:3001/api/compile', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ contractName: 'UUPSProxy' })
                                });
                                
                                if (!proxyCompileResponse.ok) {
                                  const errorData = await proxyCompileResponse.json();
                                  throw new Error(`Proxy compilation failed: ${errorData.error || 'Unknown error'}`);
                                }
                                
                                const proxyArtifact = await proxyCompileResponse.json();
                                console.log('✅ Proxy compiled');
                                
                                // Step 4: Encode initialize() call with user params
                                console.log('🔧 Step 4: Encoding initialize call...');
                                const initData = web3.eth.abi.encodeFunctionCall(
                                  {
                                    name: 'initialize',
                                    type: 'function',
                                    inputs: selected.deployConfig.constructor.map(param => ({
                                      type: param.type,
                                      name: param.name
                                    }))
                                  },
                                  selected.deployConfig.constructor.map(p => deployParams[p.name])
                                );
                                console.log('✅ Initialize data encoded');
                                
                                // Step 5: Deploy proxy with (implementation, initData)
                                console.log('🚀 Step 5: Deploying proxy...');
                                const proxyContract = new web3.eth.Contract(proxyArtifact.abi);
                                const proxyDeployTx = proxyContract.deploy({
                                  data: proxyArtifact.bytecode,
                                  arguments: [implAddress, initData]
                                });

                                const proxyGas = await proxyDeployTx.estimateGas({ from: account });
                                const proxyGasWithBuffer = proxyGas + (proxyGas * 20n / 100n);
                                
                                const deployedProxy = await proxyDeployTx.send({
                                  from: account,
                                  gas: proxyGasWithBuffer
                                });
                                
                                const proxyAddress = deployedProxy.options.address;
                                console.log('✅ Proxy deployed at:', proxyAddress);
                                console.log('🎉 UUPS deployment complete!');
                                
                                // Set proxy as primary address
                                setDeployedAddress(proxyAddress);
                                setTxHash(proxyAddress);
                                setDeployStatus('success');
                                
                                // Save deployment with implementation address
                                await saveDeployment(selected.id, selected.name, proxyAddress, proxyAddress, {
                                  implementationAddress: implAddress,
                                  isUUPS: true
                                });
                              } else {
                                // ====== REGULAR CONTRACT DEPLOYMENT ======
                                console.log('📦 Compiling contract...');
                                const compileResponse = await fetch('http://localhost:3001/api/compile', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ contractName: compilerContractName })
                                });
                                
                                if (!compileResponse.ok) {
                                  const errorData = await compileResponse.json();
                                  throw new Error(`Compilation failed: ${errorData.error || 'Unknown error'}`);
                                }
                                
                                const artifact = await compileResponse.json();
                                console.log('✅ Contract compiled');
                                
                                if (!artifact.bytecode || artifact.bytecode.length < 100) {
                                  throw new Error('Invalid bytecode returned from compilation');
                                }
                                
                                // Prepare constructor args
                                const args = selected.deployConfig.constructor.map(p => deployParams[p.name]);
                                
                                // Create contract instance
                                const contract = new web3.eth.Contract(artifact.abi);
                                
                                // Deploy
                                const deployTx = contract.deploy({
                                  data: artifact.bytecode,
                                  arguments: args
                                });

                                const gas = await deployTx.estimateGas({ from: account });
                                const gasWithBuffer = gas + (gas * 20n / 100n);
                                
                                const deployed = await deployTx.send({
                                  from: account,
                                  gas: gasWithBuffer
                                });
                                
                                const contractAddress = deployed.options.address;
                                setDeployedAddress(contractAddress);
                                setTxHash(contractAddress);
                                setDeployStatus('success');
                                
                                // Save deployment to history
                                await saveDeployment(selected.id, selected.name, contractAddress, contractAddress);
                              }
                            } catch (error) {
                              console.error('❌ Deployment error:', error);
                              
                              let userMessage = error.message || 'Deployment failed';
                              
                              if (error.message && error.message.includes('Internal JSON-RPC error')) {
                                userMessage = 'Deployment failed: Invalid bytecode or gas estimation error. The artifact file needs valid compiled bytecode. Please compile the contract first using Hardhat, Foundry, or Remix.';
                              } else if (error.message && error.message.includes('insufficient funds')) {
                                userMessage = 'Insufficient funds: Your wallet needs more ETH to pay for gas fees.';
                              } else if (error.message && error.message.includes('user rejected')) {
                                userMessage = 'Transaction rejected: You cancelled the transaction in MetaMask.';
                              }
                              
                              setErrorMessage(userMessage);
                              setDeployStatus('idle');
                            }
                          }}
                          disabled={deployStatus === 'deploying' || (!selected.deployConfig.type && !deployParams.initialOwner)}
                          className="docs-deploy-button"
                        >
                          {deployStatus === 'deploying' ? (
                            <>
                              <div className="docs-deploy-spinner"></div>
                              <span>Deploying...</span>
                            </>
                          ) : (
                            <>
                              <Rocket size={20} />
                              <span>Deploy Contract</span>
                            </>
                          )}
                        </button>

                        {/* Deployment History */}
                        {backendError && (
                          <div className="docs-deploy-info" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }}>
                            <AlertCircle size={16} />
                            <span>{backendError}</span>
                          </div>
                        )}
                        {!backendError && deploymentHistory.length > 0 && (
                          <div className="docs-deployment-history">
                            <h4 className="docs-deployment-history-title">
                              <History size={18} />
                              <span>Deployment History</span>
                            </h4>
                            {loadingHistory ? (
                              <div className="docs-deployment-history-loading">Loading history...</div>
                            ) : (
                              <div className="docs-deployment-history-list">
                                {deploymentHistory.map((deployment, idx) => {
                                  const isCurrent = deployment.is_current === 1;
                                  const deployedDate = new Date(deployment.deployed_at);
                                  const timeAgo = (() => {
                                    const seconds = Math.floor((new Date() - deployedDate) / 1000);
                                    if (seconds < 60) return `${seconds}s ago`;
                                    const minutes = Math.floor(seconds / 60);
                                    if (minutes < 60) return `${minutes}m ago`;
                                    const hours = Math.floor(minutes / 60);
                                    if (hours < 24) return `${hours}h ago`;
                                    const days = Math.floor(hours / 24);
                                    return `${days}d ago`;
                                  })();

                                  const explorers = {
                                    1: 'https://etherscan.io',
                                    5: 'https://goerli.etherscan.io',
                                    11155111: 'https://sepolia.etherscan.io',
                                    8453: 'https://basescan.org',
                                    84532: 'https://sepolia.basescan.org',
                                    42161: 'https://arbiscan.io',
                                    421614: 'https://sepolia.arbiscan.io',
                                    10: 'https://optimistic.etherscan.io',
                                    420: 'https://goerli-optimism.etherscan.io',
                                    137: 'https://polygonscan.com',
                                    80001: 'https://mumbai.polygonscan.com'
                                  };
                                  const explorerUrl = explorers[deployment.chain_id] || 'https://etherscan.io';

                                  return (
                                    <div key={deployment.id} className={`docs-deployment-history-item ${isCurrent ? 'docs-deployment-history-item-current' : ''}`}>
                                      {isCurrent && (
                                        <div className="docs-deployment-history-current-badge">
                                          <Check size={12} />
                                          <span>CURRENT</span>
                                        </div>
                                      )}
                                      <div className="docs-deployment-history-header">
                                        <span className="docs-deployment-history-network">{deployment.network_name}</span>
                                        <span className="docs-deployment-history-time">{timeAgo}</span>
                                      </div>
                                      <div className="docs-deployment-history-address">
                                        {deployment.address.slice(0, 10)}...{deployment.address.slice(-8)}
                                      </div>
                                      <div className="docs-deployment-history-deployer">
                                        By: {deployment.deployer_address.slice(0, 6)}...{deployment.deployer_address.slice(-4)}
                                      </div>
                                      <div className="docs-deployment-history-actions">
                                        <button
                                          onClick={() => navigator.clipboard.writeText(deployment.address)}
                                          className="docs-deployment-history-action"
                                          title="Copy address"
                                        >
                                          <Copy size={14} />
                                        </button>
                                        <a
                                          href={`${explorerUrl}/address/${deployment.address}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="docs-deployment-history-action"
                                          title="View on explorer"
                                        >
                                          <ExternalLink size={14} />
                                        </a>
                                        {isAdmin && !isCurrent && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                const response = await fetch(
                                                  `http://localhost:3001/api/admin/deployments/${deployment.id}/set-current`,
                                                  {
                                                    method: 'PUT',
                                                    headers: {
                                                      'Authorization': `Bearer ${adminToken}`,
                                                      'Content-Type': 'application/json'
                                                    }
                                                  }
                                                );
                                                
                                                const data = await response.json();
                                                
                                                if (data.success) {
                                                  console.log('✅ Deployment set as current');
                                                  // Reload deployment history
                                                  await loadDeploymentHistory(selectedContract);
                                                } else {
                                                  console.error('Failed to set as current:', data.error);
                                                  alert('Failed to set as current: ' + data.error);
                                                }
                                              } catch (error) {
                                                console.error('Error setting as current:', error);
                                                alert('Error: ' + error.message);
                                              }
                                            }}
                                            className="docs-deployment-set-current-btn"
                                            title="Set as current deployment"
                                          >
                                            Set as Current
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Admin Login Modal */}
      <AdminLogin 
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLoginSuccess={(token, username) => {
          setAdminToken(token);
          setIsAdmin(true);
          setAdminUsername(username);
        }}
      />
    </div>
  );
};

export default OpenworkDocs;
