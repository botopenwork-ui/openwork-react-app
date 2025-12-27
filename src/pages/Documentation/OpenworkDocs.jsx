import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Code, TestTube, Play, Database, History, ArrowRight, Edit2, Rocket, ChevronDown, ChevronRight, MessageSquare, Send, X, Copy, Check, Wallet, AlertCircle, ExternalLink, Workflow, Lock, Unlock } from 'lucide-react';
import './OpenworkDocs.css';
import { contractsData } from './data/contracts';
import { ipfsData } from './data/ipfsData';
import { columnPositions, statusColors } from './data/columnPositions';
import { arrowConnections } from './data/arrowConnections';
import { buildOppyContext, FALLBACK_RESPONSES } from './data/oppyKnowledge';
import flowsData from './data/flowsData';
import multiChainIntegrationGuide from './data/multiChainIntegrationGuide';
import FlowVisualizer from '../../components/FlowVisualizer';
import UserFlowsOverview from '../../components/UserFlowsOverview';
import AdminLogin from '../../components/AdminLogin';
import Web3 from 'web3';

// Backend API Configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const OpenworkDocs = () => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [editingStatus, setEditingStatus] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);
  const [oppyMessage, setOppyMessage] = useState('');
  const [oppyChat, setOppyChat] = useState([
    { role: 'oppy', text: `Hi! I'm Agent Oppy, your OpenWork assistant powered by Gemini AI. Ask me anything about the protocol, contracts, or how to get started! ✅ AI Ready` }
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
  const [deployedImplAddress, setDeployedImplAddress] = useState(null); // For UUPS: track implementation address
  const [txHash, setTxHash] = useState(null);
  const [deployReceipt, setDeployReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // UUPS deployment mode: 'deployNew' | 'deployImplOnly' | 'upgradeProxy'
  const [uupsMode, setUupsMode] = useState('deployNew');
  const [existingProxyAddress, setExistingProxyAddress] = useState('');
  const [existingImplAddress, setExistingImplAddress] = useState('');
  const [useExistingImpl, setUseExistingImpl] = useState(false);

  // Initialize state (for post-deployment initialization)
  const [showInitializeForm, setShowInitializeForm] = useState(false);
  const [initializeParams, setInitializeParams] = useState({});
  
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

      console.log('📥 Loading deployment history for:', contractId);

      // Use registry endpoint to get all fields including is_current
      const response = await fetch(`${BACKEND_URL}/api/registry/${contractId}/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 404) {
        // No history for this contract yet - not an error
        console.log('📥 No history found for:', contractId);
        setDeploymentHistory([]);
        setBackendError(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('📥 Loaded', data.history?.length || 0, 'deployments for:', contractId);
        if (data.history?.length > 0) {
          console.log('📥 Most recent deployment:', data.history[0].address, 'at', data.history[0].deployed_at);
        }
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
  const saveDeployment = async (contractId, contractName, address, txHash, options = {}) => {
    try {
      console.log('📝 Saving deployment:', { contractId, contractName, address, options });

      const response = await fetch(`${BACKEND_URL}/api/deployments`, {
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
          constructorParams: deployParams,
          implementationAddress: options.implementationAddress || null,
          isUUPS: options.isUUPS || false
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Deployment saved to history, ID:', data.deploymentId);
        // Reload history after save - wait a moment for DB to commit
        await new Promise(resolve => setTimeout(resolve, 100));
        await loadDeploymentHistory(contractId);
        console.log('✅ History reloaded for:', contractId);
      } else {
        console.error('❌ Failed to save deployment:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error saving deployment:', error);
      // Don't fail the deployment if history save fails
    }
  };

  // Check admin session on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const username = localStorage.getItem('adminUsername');
    if (token && username) {
      // Verify token is still valid
      fetch(`${BACKEND_URL}/api/admin/verify`, {
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
      fetch(`${BACKEND_URL}/api/admin/contracts/${selectedContract}/docs`)
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

      // Call backend chat API (secure - API key on server)
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          context: systemContext
        })
      });

      if (!response.ok) {
        throw new Error(`Backend chat API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Remove thinking message and add actual response
        setOppyChat(prev => {
          const withoutThinking = prev.filter(msg => !msg.isThinking);
          return [...withoutThinking, { role: 'oppy', text: data.response }];
        });
      } else {
        throw new Error(data.error || 'Chat API failed');
      }

    } catch (error) {
      console.error('❌ Chat error:', error);
      
      // Intelligent fallback based on keywords
      let fallbackResponse = FALLBACK_RESPONSES.default;
      const lowerMsg = userMsg.toLowerCase();
      
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

          <div>
            <div 
              onClick={() => {
                setSelectedContract('multichain');
                setActiveTab('docs');
              }}
              className={`docs-sidebar-item docs-sidebar-item-flows ${selectedContract === 'multichain' ? 'docs-sidebar-item-flows-active' : ''}`}
            >
              <div className="docs-sidebar-item-content">
                <Workflow className="docs-sidebar-item-icon" />
                <span className="docs-sidebar-item-text">Multi-Chain Integration</span>
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

      {(selected || selectedContract === 'ipfs' || selectedContract === 'oppy' || selectedContract === 'flows' || selectedContract === 'multichain') && (
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

            {selectedContract === 'multichain' && (
              <>
                <div className="docs-details-header-flows">
                  <Workflow className="docs-details-header-icon" />
                  <h2 className="docs-details-title">Multi-Chain Integration</h2>
                </div>
                <p className="docs-details-subtitle">Complete guide for developers to add new blockchains</p>
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

                {activeTab === 'docs' && selectedContract === 'multichain' && (
                  <div>
                    {multiChainIntegrationGuide['add-new-chain'] && (
                      <>
                        <div className="docs-prose">
                          <p>{multiChainIntegrationGuide['add-new-chain'].description}</p>
                        </div>

                        {/* Prerequisites Section */}
                        <div className="docs-section">
                          <h3 className="docs-section-title">📋 Prerequisites</h3>
                          <ul className="docs-feature-list">
                            {multiChainIntegrationGuide['add-new-chain'].prerequisites.map((prereq, idx) => (
                              <li key={idx} className="docs-feature-item">{prereq}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Integration Steps */}
                        <div className="docs-section">
                          <h3 className="docs-section-title">🚀 Integration Steps</h3>
                          {multiChainIntegrationGuide['add-new-chain'].steps.map((step, idx) => (
                            <div key={idx} className="docs-function-item" style={{ marginBottom: '16px' }}>
                              <button
                                onClick={() => toggleSection(`multichain-step-${idx}`)}
                                className="docs-function-toggle"
                              >
                                <span className="docs-function-name">
                                  {step.icon} Step {step.step}: {step.title}
                                </span>
                                {expandedSections[`multichain-step-${idx}`] ? 
                                  <ChevronDown className="docs-function-icon" /> : 
                                  <ChevronRight className="docs-function-icon" />
                                }
                              </button>
                              
                              {expandedSections[`multichain-step-${idx}`] && (
                                <div className="docs-function-content">
                                  <p className="docs-function-text" style={{ marginBottom: '12px' }}>
                                    {step.description}
                                  </p>
                                  
                                  <div className="docs-function-section">
                                    <h5 className="docs-function-section-title">Details:</h5>
                                    <ul className="docs-function-steps">
                                      {step.details.map((detail, detailIdx) => (
                                        <li key={detailIdx} className="docs-function-step">{detail}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="docs-function-section">
                                    <h5 className="docs-function-section-title">Code Example:</h5>
                                    <pre className="docs-code-block" style={{ margin: 0 }}>
                                      <code>{step.codeSnippet}</code>
                                    </pre>
                                  </div>

                                  {step.notes && step.notes.length > 0 && (
                                    <div className="docs-function-section">
                                      <h5 className="docs-function-section-title">Important Notes:</h5>
                                      <ul className="docs-feature-list">
                                        {step.notes.map((note, noteIdx) => (
                                          <li key={noteIdx} className="docs-feature-item">{note}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Common Issues Section */}
                        <div className="docs-section">
                          <h3 className="docs-section-title">⚠️ Common Issues & Solutions</h3>
                          {multiChainIntegrationGuide['add-new-chain'].commonIssues.map((issue, idx) => (
                            <div key={idx} className="docs-dependency-card" style={{ marginBottom: '12px' }}>
                              <div className="docs-dependency-header">
                                <span className="docs-dependency-name">{issue.issue}</span>
                              </div>
                              <p className="docs-dependency-reason" style={{ marginBottom: '6px' }}>
                                <strong>Solution:</strong> {issue.solution}
                              </p>
                              <p className="docs-dependency-reason" style={{ fontSize: '11px', color: '#6b7280' }}>
                                <strong>Debug:</strong> {issue.debug}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Supported Chains Table */}
                        <div className="docs-section">
                          <h3 className="docs-section-title">🌐 Supported Chains</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: '8px', fontSize: '12px' }}>
                            <div style={{ fontWeight: 'bold', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>Chain</div>
                            <div style={{ fontWeight: 'bold', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>Chain ID</div>
                            <div style={{ fontWeight: 'bold', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>LZ EID</div>
                            <div style={{ fontWeight: 'bold', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>Status</div>
                            
                            {multiChainIntegrationGuide['add-new-chain'].supportedChains.map((chain, idx) => (
                              <React.Fragment key={idx}>
                                <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{chain.name}</div>
                                <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '11px' }}>{chain.chainId}</div>
                                <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '11px' }}>{chain.eid}</div>
                                <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{chain.status}</div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* Multi-Chain Lifecycle Rules Section */}
                        {multiChainIntegrationGuide['add-new-chain'].multiChainLifecycleRules && (
                          <div className="docs-section">
                            <h3 className="docs-section-title">🔐 {multiChainIntegrationGuide['add-new-chain'].multiChainLifecycleRules.title}</h3>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                              {multiChainIntegrationGuide['add-new-chain'].multiChainLifecycleRules.description}
                            </p>
                            
                            {multiChainIntegrationGuide['add-new-chain'].multiChainLifecycleRules.rules.map((rule, idx) => (
                              <div key={idx} style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '20px' }}>{rule.icon}</span>
                                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{rule.category}</h4>
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{rule.description}</p>
                                <ul className="docs-feature-list">
                                  {rule.actions.map((action, actionIdx) => (
                                    <li key={actionIdx} className="docs-feature-item">
                                      <strong>{action.name}:</strong> {action.description}
                                    </li>
                                  ))}
                                </ul>
                                {rule.warning && (
                                  <div style={{ 
                                    background: '#fef3c7', 
                                    border: '1px solid #fde047', 
                                    borderRadius: '8px', 
                                    padding: '12px',
                                    marginTop: '12px',
                                    fontSize: '13px',
                                    color: '#92400e'
                                  }}>
                                    <strong>⚠️ Important:</strong> {rule.warning}
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            <div style={{ marginTop: '20px' }}>
                              <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Implementation Guidance:</h5>
                              <ul className="docs-feature-list">
                                {multiChainIntegrationGuide['add-new-chain'].multiChainLifecycleRules.implementationGuidance.map((guide, idx) => (
                                  <li key={idx} className="docs-feature-item">{guide}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div style={{ marginTop: '16px' }}>
                              <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Code Example:</h5>
                              <pre className="docs-code-block" style={{ margin: 0 }}>
                                <code>{multiChainIntegrationGuide['add-new-chain'].multiChainLifecycleRules.exampleCode}</code>
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Key Takeaways Section */}
                        <div className="docs-section">
                          <h3 className="docs-section-title">💡 Key Takeaways</h3>
                          <ul className="docs-feature-list">
                            {multiChainIntegrationGuide['add-new-chain'].keyTakeaways.map((takeaway, idx) => (
                              <li key={idx} className="docs-feature-item">{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
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
                                
                                const response = await fetch(`${BACKEND_URL}/api/admin/contracts/${selectedContract}/docs`, {
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
                                const response = await fetch(`${BACKEND_URL}/api/admin/contracts/${selectedContract}/docs`, {
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
                                const response = await fetch(`${BACKEND_URL}/api/admin/contracts/${selectedContract}/docs`, {
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
                        <h3>
                          {selected.deployConfig.type === 'uups'
                            ? (uupsMode === 'deployNew' ? 'Deployment Successful!'
                              : uupsMode === 'deployImplOnly' ? 'Implementation Deployed!'
                              : 'Proxy Upgraded!')
                            : 'Deployment Successful!'}
                        </h3>
                        <p>
                          {selected.deployConfig.type === 'uups'
                            ? (uupsMode === 'deployNew' ? 'Implementation and Proxy deployed. Initialize the proxy to complete setup.'
                              : uupsMode === 'deployImplOnly' ? 'Implementation contract deployed. Use this address to upgrade a proxy.'
                              : 'Proxy has been upgraded to the new implementation.')
                            : selected.deployConfig.postDeploy.message}
                        </p>

                        <div className="docs-deploy-result-card">
                          {/* Show Proxy Address for deployNew mode */}
                          {selected.deployConfig.type === 'uups' && uupsMode === 'deployNew' && (
                            <div className="docs-deploy-result-row">
                              <span>Proxy Address:</span>
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
                          )}

                          {/* Show Implementation Address */}
                          {selected.deployConfig.type === 'uups' && deployedImplAddress && (
                            <div className="docs-deploy-result-row" style={{ marginTop: selected.deployConfig.type === 'uups' && uupsMode === 'deployNew' ? '12px' : '0' }}>
                              <span>Implementation Address:</span>
                              <div className="docs-deploy-address">
                                {deployedImplAddress}
                                <button
                                  onClick={() => navigator.clipboard.writeText(deployedImplAddress)}
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
                                    return `${explorerUrl}/address/${deployedImplAddress}`;
                                  })()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="docs-deploy-copy-btn"
                                >
                                  <ExternalLink size={16} />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Standard contract address for non-UUPS */}
                          {selected.deployConfig.type !== 'uups' && (
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
                          )}
                        </div>

                        {/* Initialize Section for UUPS Deploy New */}
                        {selected.deployConfig.type === 'uups' && uupsMode === 'deployNew' && !showInitializeForm && (
                          <div style={{
                            background: '#fef3c7',
                            border: '2px solid #fde047',
                            borderRadius: '12px',
                            padding: '20px',
                            marginTop: '20px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <AlertCircle size={20} style={{ color: '#d97706' }} />
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#92400e' }}>
                                Proxy Needs Initialization
                              </h4>
                            </div>
                            <p style={{ fontSize: '13px', color: '#78350f', marginBottom: '16px' }}>
                              The proxy has been deployed but needs to be initialized before use.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => {
                                  setShowInitializeForm(true);
                                  // Pre-populate initialize params with defaults
                                  const params = {};
                                  if (selected.deployConfig.constructor) {
                                    selected.deployConfig.constructor.forEach(param => {
                                      if (param.default === 'WALLET') {
                                        params[param.name] = account;
                                      } else if (param.name === 'chainId' && currentNetwork) {
                                        params[param.name] = currentNetwork.chainId.toString();
                                      }
                                    });
                                  }
                                  setInitializeParams(params);
                                }}
                                className="docs-deploy-button"
                                style={{ background: '#f59e0b' }}
                              >
                                <Play size={18} />
                                <span>Initialize Proxy</span>
                              </button>
                              <button
                                onClick={() => {
                                  setDeployStatus('idle');
                                  setDeployedAddress(null);
                                  setDeployedImplAddress(null);
                                  setTxHash(null);
                                  setShowInitializeForm(false);
                                }}
                                className="docs-network-toggle-button"
                              >
                                Skip - Initialize Later
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Initialize Form */}
                        {selected.deployConfig.type === 'uups' && uupsMode === 'deployNew' && showInitializeForm && (
                          <div style={{
                            background: '#f0fdf4',
                            border: '2px solid #86efac',
                            borderRadius: '12px',
                            padding: '20px',
                            marginTop: '20px'
                          }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#166534' }}>
                              Initialize Proxy
                            </h4>

                            {selected.deployConfig.constructor && selected.deployConfig.constructor.map((param, idx) => (
                              <div key={idx} className="docs-deploy-param" style={{ marginBottom: '12px' }}>
                                <label>
                                  {param.name}
                                  <span className="docs-deploy-param-type">({param.type})</span>
                                </label>
                                <p className="docs-deploy-param-desc">{param.description}</p>
                                <input
                                  type="text"
                                  value={initializeParams[param.name] || ''}
                                  onChange={(e) => setInitializeParams(prev => ({
                                    ...prev,
                                    [param.name]: e.target.value
                                  }))}
                                  placeholder={param.placeholder || param.name}
                                />
                              </div>
                            ))}

                            {errorMessage && (
                              <div className="docs-deploy-error" style={{ marginBottom: '12px' }}>
                                <AlertCircle size={16} />
                                <span>{errorMessage}</span>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                              <button
                                onClick={async () => {
                                  try {
                                    setErrorMessage('');

                                    // Validate params
                                    const invalidParams = selected.deployConfig.constructor.filter(p => !initializeParams[p.name]);
                                    if (invalidParams.length > 0) {
                                      throw new Error(`Missing required parameters: ${invalidParams.map(p => p.name).join(', ')}`);
                                    }

                                    // Get the ABI for the contract
                                    const contractNameMapping = {
                                      'mainDAO': 'MainDAO',
                                      'token': 'VotingToken',
                                      'nowjc': 'NOWJC',
                                      'nativeAthena': 'NativeAthena',
                                      'nativeRewards': 'NativeRewards',
                                      'nativeBridge': 'NativeBridge',
                                      'mainRewards': 'MainRewards',
                                      'nativeDAO': 'NativeDAO',
                                      'mainBridge': 'MainBridge',
                                      'oracleManager': 'OracleManager',
                                      'lowjcOP': 'LOWJC',
                                      'lowjcETH': 'LOWJC',
                                      'athenaClientOP': 'AthenaClient',
                                      'athenaClientETH': 'AthenaClient',
                                      'localBridgeOP': 'LocalBridge',
                                      'localBridgeETH': 'LocalBridge'
                                    };
                                    const compilerContractName = contractNameMapping[selected.id];

                                    console.log('📦 Loading ABI for initialize...');
                                    const compileResponse = await fetch(`${BACKEND_URL}/api/compile`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ contractName: compilerContractName })
                                    });

                                    if (!compileResponse.ok) {
                                      throw new Error('Failed to load contract ABI');
                                    }

                                    const artifact = await compileResponse.json();

                                    // Find initialize function in ABI
                                    const initializeAbi = artifact.abi.find(item => item.name === 'initialize');
                                    if (!initializeAbi) {
                                      throw new Error('No initialize function found in contract ABI');
                                    }

                                    // Prepare arguments in the correct order based on ABI
                                    const args = initializeAbi.inputs.map(input => initializeParams[input.name]);

                                    console.log('🚀 Calling initialize on proxy:', deployedAddress);
                                    console.log('📋 Arguments:', args);

                                    // Create contract instance pointing to proxy address
                                    const proxyContract = new web3.eth.Contract(artifact.abi, deployedAddress);

                                    const initTx = proxyContract.methods.initialize(...args);

                                    let initGas;
                                    try {
                                      initGas = await initTx.estimateGas({ from: account });
                                    } catch (gasError) {
                                      console.log('⚠️ Gas estimation failed:', gasError.message);
                                      if (gasError.message.includes('already initialized') || gasError.message.includes('Initializable')) {
                                        throw new Error('Proxy is already initialized');
                                      }
                                      initGas = BigInt(500000);
                                    }

                                    const initGasWithBuffer = initGas + (initGas * 20n / 100n);

                                    await initTx.send({
                                      from: account,
                                      gas: initGasWithBuffer
                                    });

                                    console.log('✅ Proxy initialized successfully!');

                                    setShowInitializeForm(false);
                                    alert('✅ Proxy initialized successfully! The contract is now ready for use.');

                                  } catch (error) {
                                    console.error('❌ Initialize error:', error);
                                    setErrorMessage(error.message || 'Initialize failed');
                                  }
                                }}
                                className="docs-deploy-button"
                                style={{ background: '#16a34a' }}
                              >
                                <Check size={18} />
                                <span>Initialize</span>
                              </button>
                              <button
                                onClick={() => setShowInitializeForm(false)}
                                className="docs-network-toggle-button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Next Steps for non-UUPS or after initialization */}
                        {(selected.deployConfig.type !== 'uups' || uupsMode !== 'deployNew') && (
                          <div className="docs-deploy-next-steps">
                            <h4>Next Steps:</h4>
                            <ul>
                              {selected.deployConfig.type === 'uups' && uupsMode === 'deployImplOnly' ? (
                                <>
                                  <li>Copy the implementation address above</li>
                                  <li>Use "Upgrade Proxy" mode to upgrade an existing proxy</li>
                                  <li>Or save this address for future upgrades</li>
                                </>
                              ) : selected.deployConfig.type === 'uups' && uupsMode === 'upgradeProxy' ? (
                                <>
                                  <li>Verify the upgrade was successful on the block explorer</li>
                                  <li>Test the proxy to ensure it works with the new implementation</li>
                                  <li>Update any frontend configurations if needed</li>
                                </>
                              ) : (
                                selected.deployConfig.postDeploy.nextSteps.slice(0, 4).map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))
                              )}
                            </ul>
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            setDeployStatus('idle');
                            setDeployedAddress(null);
                            setDeployedImplAddress(null);
                            setTxHash(null);
                            setShowInitializeForm(false);
                            // Refresh history to ensure it's up to date
                            if (selected?.id) {
                              await loadDeploymentHistory(selected.id);
                            }
                          }}
                          className="docs-deploy-button"
                        >
                          Deploy Another
                        </button>

                        {/* Show deployment history in success view */}
                        {deploymentHistory.length > 0 && (
                          <div className="docs-deployment-history" style={{ marginTop: '20px' }}>
                            <h4 className="docs-deployment-history-title">
                              <History size={18} />
                              <span>All Deployments ({deploymentHistory.length})</span>
                            </h4>
                            <div className="docs-deployment-history-list">
                              {deploymentHistory.slice(0, 5).map((deployment, idx) => {
                                const isCurrent = deployment.is_current === 1;
                                return (
                                  <div key={idx} className={`docs-deployment-history-item ${isCurrent ? 'current' : ''}`}>
                                    <div className="docs-deployment-history-item-header">
                                      <span className="docs-deployment-history-address">
                                        {deployment.address?.slice(0, 10)}...{deployment.address?.slice(-8)}
                                      </span>
                                      {isCurrent && <span className="docs-deployment-current-badge">Current</span>}
                                    </div>
                                    <div className="docs-deployment-history-item-meta">
                                      <span>{deployment.network_name}</span>
                                      <span>{new Date(deployment.deployed_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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

                        {selected.deployConfig.type === 'uups' ? (
                          <div className="docs-uups-mode-section">
                            {/* UUPS Mode Selector */}
                            <div className="docs-uups-mode-selector">
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                Deployment Mode:
                              </h4>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => setUupsMode('deployNew')}
                                  className={`docs-uups-mode-btn ${uupsMode === 'deployNew' ? 'docs-uups-mode-btn-active' : ''}`}
                                  style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: uupsMode === 'deployNew' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                                    background: uupsMode === 'deployNew' ? '#eff6ff' : 'white',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    flex: '1',
                                    minWidth: '140px'
                                  }}
                                >
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: uupsMode === 'deployNew' ? '#1d4ed8' : '#374151' }}>
                                    Deploy New
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                    Implementation + Proxy
                                  </div>
                                </button>
                                <button
                                  onClick={() => setUupsMode('deployImplOnly')}
                                  className={`docs-uups-mode-btn ${uupsMode === 'deployImplOnly' ? 'docs-uups-mode-btn-active' : ''}`}
                                  style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: uupsMode === 'deployImplOnly' ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                                    background: uupsMode === 'deployImplOnly' ? '#f5f3ff' : 'white',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    flex: '1',
                                    minWidth: '140px'
                                  }}
                                >
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: uupsMode === 'deployImplOnly' ? '#6d28d9' : '#374151' }}>
                                    Deploy Impl Only
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                    For upgrades
                                  </div>
                                </button>
                                <button
                                  onClick={() => setUupsMode('upgradeProxy')}
                                  className={`docs-uups-mode-btn ${uupsMode === 'upgradeProxy' ? 'docs-uups-mode-btn-active' : ''}`}
                                  style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: uupsMode === 'upgradeProxy' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                                    background: uupsMode === 'upgradeProxy' ? '#fffbeb' : 'white',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    flex: '1',
                                    minWidth: '140px'
                                  }}
                                >
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: uupsMode === 'upgradeProxy' ? '#b45309' : '#374151' }}>
                                    Upgrade Proxy
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                    Existing proxy
                                  </div>
                                </button>
                              </div>
                            </div>

                            {/* Mode-specific content */}
                            {uupsMode === 'deployNew' && (
                              <div className="docs-deploy-info" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', marginTop: '16px' }}>
                                <AlertCircle size={16} />
                                <div>
                                  <strong>Deploy New:</strong> Deploys implementation + proxy with empty init data.
                                  After deployment, you can initialize the proxy using the Initialize button.
                                </div>
                              </div>
                            )}

                            {uupsMode === 'deployImplOnly' && (
                              <div className="docs-deploy-info" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', color: '#5b21b6', marginTop: '16px' }}>
                                <AlertCircle size={16} />
                                <div>
                                  <strong>Deploy Implementation Only:</strong> Deploys only the implementation contract.
                                  Use this when you want to upgrade an existing proxy to a new implementation.
                                </div>
                              </div>
                            )}

                            {uupsMode === 'upgradeProxy' && (
                              <div style={{ marginTop: '16px' }}>
                                <div className="docs-deploy-info" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', marginBottom: '16px' }}>
                                  <AlertCircle size={16} />
                                  <div>
                                    <strong>Upgrade Proxy:</strong> Upgrades an existing proxy to a new implementation.
                                    You must be the owner of the proxy to perform this operation.
                                  </div>
                                </div>

                                {/* Existing Proxy Address Input */}
                                <div className="docs-deploy-param" style={{ marginBottom: '16px' }}>
                                  <label>
                                    Existing Proxy Address
                                    <span className="docs-deploy-param-type">(address)</span>
                                  </label>
                                  <p className="docs-deploy-param-desc">The proxy contract you want to upgrade</p>
                                  <input
                                    type="text"
                                    value={existingProxyAddress}
                                    onChange={(e) => setExistingProxyAddress(e.target.value)}
                                    placeholder="0x..."
                                    disabled={deployStatus === 'deploying'}
                                  />
                                </div>

                                {/* Implementation Source */}
                                <div style={{ marginBottom: '16px' }}>
                                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                                    New Implementation:
                                  </label>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                      <input
                                        type="radio"
                                        checked={!useExistingImpl}
                                        onChange={() => setUseExistingImpl(false)}
                                        style={{ margin: 0 }}
                                      />
                                      <span style={{ fontSize: '13px' }}>Deploy new implementation</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                      <input
                                        type="radio"
                                        checked={useExistingImpl}
                                        onChange={() => setUseExistingImpl(true)}
                                        style={{ margin: 0 }}
                                      />
                                      <span style={{ fontSize: '13px' }}>Use existing implementation address</span>
                                    </label>
                                  </div>

                                  {useExistingImpl && (
                                    <div className="docs-deploy-param" style={{ marginTop: '12px' }}>
                                      <input
                                        type="text"
                                        value={existingImplAddress}
                                        onChange={(e) => setExistingImplAddress(e.target.value)}
                                        placeholder="0x... (implementation address)"
                                        disabled={deployStatus === 'deploying'}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
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
                                'mainRewards': 'MainRewards',
                                'nativeDAO': 'NativeDAO',
                                'mainBridge': 'MainBridge',
                                'oracleManager': 'OracleManager',
                                'openworkGenesis': 'OpenworkGenesis',
                                'profileGenesis': 'ProfileGenesis',
                                'profileManager': 'ProfileManager',
                                'contractRegistry': 'ContractRegistry',
                                'lowjcOP': 'LOWJC',
                                'lowjcETH': 'LOWJC',
                                'athenaClientOP': 'AthenaClient',
                                'athenaClientETH': 'AthenaClient',
                                'localBridgeOP': 'LocalBridge',
                                'localBridgeETH': 'LocalBridge',
                                'cctpTransceiverL2': 'CCTPTransceiver',
                                'cctpTransceiverOP': 'CCTPTransceiver',
                                'cctpTransceiverETH': 'CCTPTransceiver',
                                'genesisReaderHelper': 'GenesisReaderHelper'
                              };

                              const compilerContractName = contractNameMapping[selected.id];
                              if (!compilerContractName) {
                                throw new Error(`No compiler mapping found for contract: ${selected.id}`);
                              }

                              // Check if this is a UUPS contract
                              const isUUPS = selected.deployConfig.type === 'uups';

                              // Validate parameters (only for regular contracts, UUPS initialized separately)
                              if (!isUUPS) {
                                const invalidParams = selected.deployConfig.constructor.filter(p => !deployParams[p.name]);
                                if (invalidParams.length > 0) {
                                  throw new Error(`Missing required parameters: ${invalidParams.map(p => p.name).join(', ')}`);
                                }
                              }

                              if (isUUPS) {
                                // ====== UUPS DEPLOYMENT MODES ======

                                if (uupsMode === 'deployNew') {
                                  // MODE 1: Deploy Implementation + Proxy
                                  console.log('🔷 Deploying UUPS contract (Implementation + Proxy)...');

                                  // Step 1: Compile implementation contract
                                  console.log('📦 Step 1: Compiling implementation...');
                                  const implCompileResponse = await fetch(`${BACKEND_URL}/api/compile`, {
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
                                  });

                                  let implGas;
                                  try {
                                    implGas = await implDeployTx.estimateGas({ from: account });
                                    console.log('✅ Gas estimated:', implGas.toString());
                                  } catch (gasError) {
                                    console.log('⚠️ Gas estimation failed, using fixed limit');
                                    implGas = BigInt(5000000);
                                  }

                                  const implGasWithBuffer = implGas + (implGas * 20n / 100n);
                                  const deployedImpl = await implDeployTx.send({
                                    from: account,
                                    gas: implGasWithBuffer
                                  });

                                  const implAddress = deployedImpl.options.address;
                                  console.log('✅ Implementation deployed at:', implAddress);

                                  // Step 3: Compile proxy contract
                                  console.log('📦 Step 3: Compiling proxy...');
                                  const proxyCompileResponse = await fetch(`${BACKEND_URL}/api/compile`, {
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

                                  // Step 4: Deploy proxy with (implementation, 0x)
                                  console.log('🚀 Step 4: Deploying proxy...');
                                  const proxyContract = new web3.eth.Contract(proxyArtifact.abi);
                                  const proxyDeployTx = proxyContract.deploy({
                                    data: proxyArtifact.bytecode,
                                    arguments: [implAddress, '0x']
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

                                  setDeployedAddress(proxyAddress);
                                  setDeployedImplAddress(implAddress);
                                  setTxHash(proxyAddress);
                                  setDeployStatus('success');

                                  await saveDeployment(selected.id, selected.name, proxyAddress, proxyAddress, {
                                    implementationAddress: implAddress,
                                    isUUPS: true
                                  });

                                } else if (uupsMode === 'deployImplOnly') {
                                  // MODE 2: Deploy Implementation Only
                                  console.log('🔷 Deploying Implementation Only...');

                                  const implCompileResponse = await fetch(`${BACKEND_URL}/api/compile`, {
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

                                  const implContract = new web3.eth.Contract(implArtifact.abi);
                                  const implDeployTx = implContract.deploy({
                                    data: implArtifact.bytecode
                                  });

                                  let implGas;
                                  try {
                                    implGas = await implDeployTx.estimateGas({ from: account });
                                  } catch (gasError) {
                                    implGas = BigInt(5000000);
                                  }

                                  const implGasWithBuffer = implGas + (implGas * 20n / 100n);
                                  const deployedImpl = await implDeployTx.send({
                                    from: account,
                                    gas: implGasWithBuffer
                                  });

                                  const implAddress = deployedImpl.options.address;
                                  console.log('✅ Implementation deployed at:', implAddress);

                                  setDeployedAddress(implAddress);
                                  setDeployedImplAddress(implAddress);
                                  setTxHash(implAddress);
                                  setDeployStatus('success');

                                  // Save implementation-only deployment to history
                                  await saveDeployment(selected.id, selected.name, implAddress, implAddress, {
                                    implementationAddress: implAddress,
                                    isUUPS: false // Implementation only, not a proxy
                                  });

                                } else if (uupsMode === 'upgradeProxy') {
                                  // MODE 3: Upgrade Existing Proxy
                                  console.log('🔷 Upgrading existing proxy...');

                                  if (!existingProxyAddress || !existingProxyAddress.startsWith('0x')) {
                                    throw new Error('Please enter a valid proxy address');
                                  }

                                  let newImplAddress;

                                  if (useExistingImpl) {
                                    // Use existing implementation address
                                    if (!existingImplAddress || !existingImplAddress.startsWith('0x')) {
                                      throw new Error('Please enter a valid implementation address');
                                    }
                                    newImplAddress = existingImplAddress;
                                    console.log('📍 Using existing implementation:', newImplAddress);
                                  } else {
                                    // Deploy new implementation first
                                    console.log('📦 Deploying new implementation...');
                                    const implCompileResponse = await fetch(`${BACKEND_URL}/api/compile`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ contractName: compilerContractName })
                                    });

                                    if (!implCompileResponse.ok) {
                                      const errorData = await implCompileResponse.json();
                                      throw new Error(`Implementation compilation failed: ${errorData.error || 'Unknown error'}`);
                                    }

                                    const implArtifact = await implCompileResponse.json();

                                    const implContract = new web3.eth.Contract(implArtifact.abi);
                                    const implDeployTx = implContract.deploy({
                                      data: implArtifact.bytecode
                                    });

                                    let implGas;
                                    try {
                                      implGas = await implDeployTx.estimateGas({ from: account });
                                    } catch (gasError) {
                                      implGas = BigInt(5000000);
                                    }

                                    const implGasWithBuffer = implGas + (implGas * 20n / 100n);
                                    const deployedImpl = await implDeployTx.send({
                                      from: account,
                                      gas: implGasWithBuffer
                                    });

                                    newImplAddress = deployedImpl.options.address;
                                    console.log('✅ New implementation deployed at:', newImplAddress);
                                  }

                                  // Call upgradeToAndCall on the proxy
                                  console.log('🔄 Calling upgradeToAndCall on proxy...');
                                  const UUPS_UPGRADE_ABI = [{
                                    "inputs": [
                                      { "name": "newImplementation", "type": "address" },
                                      { "name": "data", "type": "bytes" }
                                    ],
                                    "name": "upgradeToAndCall",
                                    "outputs": [],
                                    "stateMutability": "payable",
                                    "type": "function"
                                  }];

                                  const proxyContract = new web3.eth.Contract(UUPS_UPGRADE_ABI, existingProxyAddress);

                                  const upgradeTx = proxyContract.methods.upgradeToAndCall(newImplAddress, '0x');

                                  let upgradeGas;
                                  try {
                                    upgradeGas = await upgradeTx.estimateGas({ from: account });
                                  } catch (gasError) {
                                    console.log('⚠️ Gas estimation failed:', gasError.message);
                                    // Common error: not owner or upgrade not authorized
                                    if (gasError.message.includes('revert') || gasError.message.includes('OwnableUnauthorizedAccount')) {
                                      throw new Error('Upgrade failed: You are not the owner of this proxy, or upgrade is not authorized.');
                                    }
                                    upgradeGas = BigInt(200000);
                                  }

                                  const upgradeGasWithBuffer = upgradeGas + (upgradeGas * 20n / 100n);

                                  await upgradeTx.send({
                                    from: account,
                                    gas: upgradeGasWithBuffer
                                  });

                                  console.log('✅ Proxy upgraded successfully!');

                                  setDeployedAddress(existingProxyAddress);
                                  setDeployedImplAddress(newImplAddress);
                                  setTxHash(existingProxyAddress);
                                  setDeployStatus('success');

                                  // Save upgrade to history
                                  await saveDeployment(selected.id, selected.name, existingProxyAddress, existingProxyAddress, {
                                    implementationAddress: newImplAddress,
                                    isUUPS: true
                                  });
                                }
                              } else {
                                // ====== REGULAR CONTRACT DEPLOYMENT ======
                                console.log('📦 Compiling contract...');
                                const compileResponse = await fetch(`${BACKEND_URL}/api/compile`, {
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
                          disabled={
                            !isAdmin ||
                            deployStatus === 'deploying' ||
                            (selected.deployConfig.type !== 'uups' && selected.deployConfig.constructor.some(p => !deployParams[p.name])) ||
                            (selected.deployConfig.type === 'uups' && uupsMode === 'upgradeProxy' && !existingProxyAddress) ||
                            (selected.deployConfig.type === 'uups' && uupsMode === 'upgradeProxy' && useExistingImpl && !existingImplAddress)
                          }
                          className="docs-deploy-button"
                          title={!isAdmin ? 'Admin login required to deploy' : ''}
                        >
                          {deployStatus === 'deploying' ? (
                            <>
                              <div className="docs-deploy-spinner"></div>
                              <span>
                                {selected.deployConfig.type === 'uups'
                                  ? (uupsMode === 'deployNew' ? 'Deploying...'
                                    : uupsMode === 'deployImplOnly' ? 'Deploying Implementation...'
                                    : 'Upgrading Proxy...')
                                  : 'Deploying...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Rocket size={20} />
                              <span>
                                {!isAdmin
                                  ? 'Admin Login Required'
                                  : selected.deployConfig.type === 'uups'
                                    ? (uupsMode === 'deployNew' ? 'Deploy Implementation + Proxy'
                                      : uupsMode === 'deployImplOnly' ? 'Deploy Implementation'
                                      : 'Upgrade Proxy')
                                    : 'Deploy Contract'}
                              </span>
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
                                                  `${BACKEND_URL}/api/admin/deployments/${deployment.id}/set-current`,
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
