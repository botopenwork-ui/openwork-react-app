import React, { useState } from 'react';

const UserFlowsOverview = ({ onClose }) => {
  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);

  // Flow definitions with paths - cross-checked against all contract documentation
  // IPFS is only used when uploading NEW data (job details, applications, work submissions, profiles, dispute evidence)
  // NOT used for: starting jobs (just escrows), releasing payments, voting, staking, claiming
  const flows = {
    postJob: {
      id: 'postJob',
      name: 'Post Job',
      color: '#3B82F6',
      userType: 'jobGiver',
      description: '1) Upload job to IPFS → 2) Call LOWJC with hash → 3) LayerZero syncs to Native',
      path: ['user', 'ipfs', 'lowjc', 'localBridge', 'nativeBridge', 'nowjc', 'genesis']
    },
    applyJob: {
      id: 'applyJob',
      name: 'Apply to Job',
      color: '#8B5CF6',
      userType: 'freelancer',
      description: '1) Upload application + milestones to IPFS → 2) Call LOWJC → 3) Sync to Native',
      path: ['user', 'ipfs', 'lowjc', 'localBridge', 'nativeBridge', 'nowjc', 'genesis']
    },
    startJob: {
      id: 'startJob',
      name: 'Start Job',
      color: '#10B981',
      userType: 'jobGiver',
      description: 'Select applicant via LayerZero + escrow USDC via CCTP (parallel channels).',
      paths: [
        ['user', 'lowjc', 'localBridge', 'nativeBridge', 'nowjc', 'genesis'],
        ['user', 'lowjc', 'cctpLocal', 'cctpNative', 'nowjc', 'genesis']
      ]
    },
    submitWork: {
      id: 'submitWork',
      name: 'Submit Work',
      color: '#F59E0B',
      userType: 'freelancer',
      description: '1) Upload deliverables to IPFS → 2) Call LOWJC.submitWork → 3) Notify job giver',
      path: ['user', 'ipfs', 'lowjc', 'localBridge', 'nativeBridge', 'nowjc']
    },
    releasePayment: {
      id: 'releasePayment',
      name: 'Release Payment',
      color: '#EC4899',
      userType: 'jobGiver',
      description: 'Approve submitted work, NOWJC releases USDC via CCTP + triggers OW reward calc.',
      paths: [
        ['user', 'lowjc', 'localBridge', 'nativeBridge', 'nowjc', 'nativeRewards'],
        ['user', 'lowjc', 'cctpLocal', 'cctpNative', 'nowjc']
      ]
    },
    directContract: {
      id: 'directContract',
      name: 'Direct Contract',
      color: '#06B6D4',
      userType: 'jobGiver',
      description: '1) Upload job to IPFS → 2) Send USDC + call LOWJC → 3) CCTP escrow → Start',
      paths: [
        ['user', 'ipfs', 'lowjc', 'localBridge', 'nativeBridge', 'nowjc', 'genesis'],
        ['user', 'ipfs', 'lowjc', 'cctpLocal', 'cctpNative', 'nowjc', 'genesis']
      ]
    },
    raiseDispute: {
      id: 'raiseDispute',
      name: 'Raise Dispute',
      color: '#EF4444',
      userType: 'any',
      description: '1) Upload evidence to IPFS → 2) Call Athena + pay USDC → 3) Oracle voting',
      path: ['user', 'ipfs', 'athenaClient', 'localBridge', 'nativeBridge', 'nativeAthena', 'oracleManager']
    },
    voteDispute: {
      id: 'voteDispute',
      name: 'Vote on Dispute',
      color: '#F97316',
      userType: 'athena',
      description: 'Oracle members vote. Power = (stake × duration) + earned tokens. Need 100+ OW.',
      path: ['user', 'nativeAthena', 'nativeDAO', 'nativeRewards', 'genesis']
    },
    settleDispute: {
      id: 'settleDispute',
      name: 'Settle Dispute',
      color: '#DC2626',
      userType: 'any',
      description: 'Anyone calls after voting period. Athena releases funds via NOWJC → CCTP → Winner Wallet.',
      path: ['user', 'nativeAthena', 'genesis', 'nowjc', 'cctpNative', 'cctpLocal']
    },
    stake: {
      id: 'stake',
      name: 'Stake Tokens',
      color: '#6366F1',
      userType: 'dao',
      description: 'Lock OW tokens. Multipliers: 1wk=1x, 1mo=1.5x, 3mo=2x, 6mo=3x, 1yr=5x.',
      path: ['user', 'owToken', 'mainDAO', 'mainBridge', 'nativeBridge', 'nativeDAO']
    },
    propose: {
      id: 'propose',
      name: 'Create Proposal',
      color: '#7C3AED',
      userType: 'dao',
      description: 'Submit governance proposal. Requires 100+ OW. Unlocks reward tokens.',
      path: ['user', 'mainDAO', 'mainBridge', 'nativeBridge', 'nativeRewards']
    },
    voteProposal: {
      id: 'voteProposal',
      name: 'Vote Proposal',
      color: '#A855F7',
      userType: 'dao',
      description: 'Cast vote on DAO proposal. Counts as governance action, unlocks rewards.',
      path: ['user', 'mainDAO', 'mainBridge', 'nativeBridge', 'nativeRewards']
    },
    earnRewards: {
      id: 'earnRewards',
      name: 'Earn Rewards',
      color: '#84CC16',
      userType: 'rewards',
      description: 'Automatic on payment. 20-band system: Band 1-2=300 OW/USDT down to ~0.01.',
      path: ['nowjc', 'nativeRewards', 'genesis']
    },
    syncRewards: {
      id: 'syncRewards',
      name: 'Sync Rewards',
      color: '#14B8A6',
      userType: 'rewards',
      description: 'Sync claimable balance from Native to Main chain before claiming OW tokens.',
      path: ['user', 'nowjc', 'nativeRewards', 'nativeBridge', 'mainBridge', 'mainRewards']
    },
    claimRewards: {
      id: 'claimRewards',
      name: 'Claim Rewards',
      color: '#22C55E',
      userType: 'rewards',
      description: 'Withdraw earned & unlocked OW tokens. Requires synced balance > 0.',
      path: ['user', 'mainRewards', 'owToken']
    },
    createProfile: {
      id: 'createProfile',
      name: 'Create Profile',
      color: '#A855F7',
      userType: 'any',
      description: '1) Upload profile to IPFS → 2) Call LOWJC → 3) Sync to ProfileManager on Native',
      path: ['user', 'ipfs', 'lowjc', 'localBridge', 'nativeBridge', 'profileManager', 'profileGenesis']
    },
    updateProfile: {
      id: 'updateProfile',
      name: 'Update Profile',
      color: '#D946EF',
      userType: 'any',
      description: '1) Upload new data to IPFS → 2) Update on-chain hash → 3) Sync to Native',
      path: ['user', 'ipfs', 'lowjc', 'localBridge', 'nativeBridge', 'profileManager', 'profileGenesis']
    },
    delegate: {
      id: 'delegate',
      name: 'Delegate Votes',
      color: '#0EA5E9',
      userType: 'dao',
      description: 'Delegate on Main DAO (for Main governance) or Native DAO (for Athena disputes).',
      paths: [
        ['user', 'mainDAO'],
        ['user', 'nativeDAO']
      ]
    }
  };

  const userTypes = {
    jobGiver: { name: 'Job Giver', color: '#3B82F6', icon: '💼' },
    freelancer: { name: 'Freelancer', color: '#10B981', icon: '👨‍💻' },
    dao: { name: 'DAO Member', color: '#8B5CF6', icon: '🏛️' },
    athena: { name: 'Athena Voter', color: '#F59E0B', icon: '⚖️' },
    rewards: { name: 'Reward Claimer', color: '#22C55E', icon: '🏆' },
    any: { name: 'Any User', color: '#6B7280', icon: '👤' }
  };

  // Contract positions - redesigned layout for clearer flow visualization
  // User on left, then flows go left-to-right: Local → Native
  // IPFS positioned to side of user (for data upload flows)
  // USDC positioned near LOWJC (same contract call includes USDC transfer)
  const contracts = {
    // User entry point (left side, middle height)
    user: { x: 80, y: 280, name: 'User', subtitle: 'Wallet', region: 'user' },

    // Off-chain storage (above-left of user, data uploads go here first)
    ipfs: { x: 80, y: 100, name: 'IPFS', subtitle: 'Pinata Storage', region: 'offchain' },

    // Local Chain contracts - Job/Payment flows
    usdc: { x: 220, y: 100, name: 'USDC', subtitle: 'Circle Stablecoin', region: 'local' },
    lowjc: { x: 220, y: 220, name: 'LOWJC', subtitle: 'Local Job Contract', region: 'local' },
    athenaClient: { x: 220, y: 340, name: 'Athena Client', subtitle: 'Dispute Entry', region: 'local' },
    cctpLocal: { x: 360, y: 100, name: 'CCTP Local', subtitle: 'Circle Transfer', region: 'local' },
    localBridge: { x: 360, y: 260, name: 'Local Bridge', subtitle: 'LayerZero OApp', region: 'local' },

    // Main Chain (bottom - for governance/rewards claiming) - 2x2 grid layout
    owToken: { x: 220, y: 515, name: 'OW Token', subtitle: 'ERC-20 Governance', region: 'main' },
    mainDAO: { x: 360, y: 515, name: 'Main DAO', subtitle: 'OpenZeppelin Gov', region: 'main' },
    mainRewards: { x: 220, y: 640, name: 'Main Rewards', subtitle: 'Claim Hub (UUPS)', region: 'main' },
    mainBridge: { x: 360, y: 640, name: 'Main Bridge', subtitle: 'LayerZero OApp', region: 'main' },

    // Native Chain (right side - central hub for all data)
    nativeBridge: { x: 520, y: 260, name: 'Native Bridge', subtitle: 'LayerZero Hub', region: 'native' },
    cctpNative: { x: 520, y: 100, name: 'CCTP Native', subtitle: 'Circle Transfer', region: 'native' },
    nowjc: { x: 680, y: 180, name: 'NOWJC', subtitle: 'Native Job (UUPS)', region: 'native' },
    genesis: { x: 840, y: 100, name: 'Genesis', subtitle: 'Job Data Store', region: 'native' },
    nativeAthena: { x: 680, y: 300, name: 'Native Athena', subtitle: 'Dispute (UUPS)', region: 'native' },
    nativeDAO: { x: 840, y: 300, name: 'Native DAO', subtitle: 'Gov Mirror (UUPS)', region: 'native' },
    nativeRewards: { x: 840, y: 200, name: 'Native Rewards', subtitle: '20-Band Calc', region: 'native' },
    profileManager: { x: 680, y: 420, name: 'Profile Mgr', subtitle: 'User Profiles', region: 'native' },
    oracleManager: { x: 840, y: 420, name: 'Oracle Mgr', subtitle: 'Skill Oracles', region: 'native' },
    profileGenesis: { x: 840, y: 520, name: 'Profile Genesis', subtitle: 'Profile Storage', region: 'native' },
    contractRegistry: { x: 680, y: 520, name: 'Registry', subtitle: 'Address Lookup', region: 'native' }
  };

  const regions = {
    offchain: { x: 35, y: 50, width: 90, height: 100, name: 'Off-chain', color: '#FEE2E2', borderColor: '#FCA5A5' },
    local: { x: 165, y: 50, width: 255, height: 360, name: 'Local Chains (OP, ETH, Base, Polygon)', color: '#EEF2FF', borderColor: '#C7D2FE' },
    main: { x: 165, y: 480, width: 270, height: 210, name: 'Main Chain (Base Sepolia → Ethereum)', color: '#FEF3C7', borderColor: '#FCD34D' },
    native: { x: 460, y: 50, width: 450, height: 500, name: 'Native Chain (Arbitrum Sepolia)', color: '#ECFDF5', borderColor: '#6EE7B7' }
  };

  const isFlowActive = (flowId) => {
    return hoveredFlow === flowId || selectedFlow === flowId;
  };

  const isContractInFlow = (contractId) => {
    if (!hoveredFlow && !selectedFlow) return false;
    const activeFlow = flows[hoveredFlow] || flows[selectedFlow];
    // Handle both single path and multiple paths
    if (activeFlow?.paths) {
      return activeFlow.paths.some(p => p.includes(contractId));
    }
    return activeFlow?.path?.includes(contractId);
  };

  const activeFlowColor = () => {
    const activeFlow = flows[hoveredFlow] || flows[selectedFlow];
    return activeFlow?.color || '#3B82F6';
  };

  // Group flows by category
  const flowCategories = {
    'Jobs': ['postJob', 'applyJob', 'startJob', 'submitWork', 'releasePayment', 'directContract'],
    'Disputes': ['raiseDispute', 'voteDispute', 'settleDispute'],
    'Governance': ['stake', 'propose', 'voteProposal', 'delegate'],
    'Rewards': ['earnRewards', 'syncRewards', 'claimRewards'],
    'Profile': ['createProfile', 'updateProfile']
  };

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#F9FAFB',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>
            OpenWork System Flows
          </h1>
          <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>
            {Object.keys(flows).length} user flows • Hover to highlight • Click to lock • Data: IPFS → Contracts: LayerZero V2 → Payments: Circle CCTP
          </p>
        </div>
        <button
          onClick={() => onClose ? onClose() : window.history.back()}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#666'
          }}
        >
          ✕ Close
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Flow List Sidebar */}
        <div style={{
          width: '260px',
          borderRight: '1px solid #E5E7EB',
          backgroundColor: '#fff',
          overflow: 'auto',
          padding: '12px',
          flexShrink: 0
        }}>
          {Object.entries(flowCategories).map(([category, flowIds]) => (
            <div key={category} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#999',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {category} ({flowIds.length})
              </div>
              {flowIds.map(flowId => {
                const flow = flows[flowId];
                if (!flow) return null;
                return (
                  <div
                    key={flow.id}
                    onMouseEnter={() => !selectedFlow && setHoveredFlow(flow.id)}
                    onMouseLeave={() => !selectedFlow && setHoveredFlow(null)}
                    onClick={() => setSelectedFlow(selectedFlow === flow.id ? null : flow.id)}
                    style={{
                      padding: '8px 10px',
                      marginBottom: '2px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isFlowActive(flow.id) ? `${flow.color}12` : 'transparent',
                      border: isFlowActive(flow.id) ? `1px solid ${flow.color}40` : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: flow.color,
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontSize: '12px',
                        fontWeight: isFlowActive(flow.id) ? '600' : '500',
                        color: isFlowActive(flow.id) ? flow.color : '#374151'
                      }}>
                        {flow.name}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '9px',
                      color: '#9CA3AF',
                      marginTop: '2px',
                      marginLeft: '16px'
                    }}>
                      {userTypes[flow.userType]?.icon} {userTypes[flow.userType]?.name}
                    </div>
                    {isFlowActive(flow.id) && (
                      <div style={{
                        fontSize: '9px',
                        color: '#666',
                        marginTop: '4px',
                        marginLeft: '16px',
                        lineHeight: '1.4'
                      }}>
                        {flow.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Protocol Legend */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>
              Protocols
            </div>
            <div style={{ fontSize: '9px', color: '#666', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>📦 <strong>IPFS/Pinata</strong> - Off-chain data storage</div>
              <div>🔗 <strong>LayerZero V2</strong> - Cross-chain messaging</div>
              <div>💵 <strong>Circle CCTP</strong> - USDC transfers</div>
              <div>🔷 <strong>UUPS</strong> - Upgradeable proxies</div>
            </div>
          </div>
        </div>

        {/* Main Diagram */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px 20px' }}>
          <svg width="960" height="840" style={{ display: 'block', margin: '0 auto' }}>
            {/* Regions */}
            {Object.entries(regions).map(([id, region]) => (
              <g key={id}>
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  rx="16"
                  fill={region.color}
                  stroke={region.borderColor}
                  strokeWidth="2"
                  strokeDasharray="6,4"
                />
                <text
                  x={region.x + 12}
                  y={region.y + 24}
                  fontSize="11"
                  fontWeight="600"
                  fill="#6B7280"
                >
                  {region.name}
                </text>
              </g>
            ))}

            {/* Flow Paths */}
            {Object.values(flows).map(flow => {
              const active = isFlowActive(flow.id);
              
              // Helper function to adjust line coordinates for better edge connections
              const getLineCoords = (point, next) => {
                let x1 = point.x;
                let y1 = point.y;
                let x2 = next.x;
                let y2 = next.y;
                
                // Special case: mainBridge to nativeBridge - start from right edge
                if (point.region === 'main' && next.region === 'native' && y1 > y2) {
                  x1 = point.x + 52; // Right edge of contract box
                }
                
                return { x1, y1, x2, y2 };
              };
              
              // Handle flows with multiple parallel paths
              if (flow.paths) {
                return (
                  <g key={flow.id}>
                    {flow.paths.map((singlePath, pathIdx) => {
                      const points = singlePath.map(id => contracts[id]).filter(Boolean);
                      return points.slice(0, -1).map((point, idx) => {
                        const next = points[idx + 1];
                        const coords = getLineCoords(point, next);
                        return (
                          <line
                            key={`${pathIdx}-${idx}`}
                            x1={coords.x1}
                            y1={coords.y1}
                            x2={coords.x2}
                            y2={coords.y2}
                            stroke={flow.color}
                            strokeWidth={active ? 3 : 1}
                            strokeOpacity={active ? 0.9 : 0.06}
                            markerEnd={active ? `url(#arrow-${flow.id})` : ''}
                            style={{ transition: 'all 0.2s ease' }}
                          />
                        );
                      });
                    })}
                  </g>
                );
              }
              
              // Handle flows with single path
              const points = flow.path.map(id => contracts[id]).filter(Boolean);
              return (
                <g key={flow.id}>
                  {points.slice(0, -1).map((point, idx) => {
                    const next = points[idx + 1];
                    const coords = getLineCoords(point, next);

                    return (
                      <line
                        key={idx}
                        x1={coords.x1}
                        y1={coords.y1}
                        x2={coords.x2}
                        y2={coords.y2}
                        stroke={flow.color}
                        strokeWidth={active ? 3 : 1}
                        strokeOpacity={active ? 0.9 : 0.06}
                        markerEnd={active ? `url(#arrow-${flow.id})` : ''}
                        style={{ transition: 'all 0.2s ease' }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Arrow markers */}
            <defs>
              {Object.values(flows).map(flow => (
                <marker
                  key={flow.id}
                  id={`arrow-${flow.id}`}
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill={flow.color} />
                </marker>
              ))}
            </defs>

            {/* Contract Nodes */}
            {Object.entries(contracts).map(([id, contract]) => {
              const inFlow = isContractInFlow(id);
              const isUser = id === 'user';
              const isIPFS = id === 'ipfs';
              const flowColor = activeFlowColor();

              return (
                <g key={id}>
                  {isUser ? (
                    <>
                      <circle
                        cx={contract.x}
                        cy={contract.y}
                        r="30"
                        fill={inFlow ? flowColor : '#fff'}
                        stroke={inFlow ? flowColor : '#D1D5DB'}
                        strokeWidth="2"
                        style={{ transition: 'all 0.2s ease' }}
                      />
                      <text x={contract.x} y={contract.y + 5} textAnchor="middle" fontSize="22">👤</text>
                      <text x={contract.x} y={contract.y + 50} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151">User</text>
                    </>
                  ) : isIPFS ? (
                    <>
                      <rect
                        x={contract.x - 35}
                        y={contract.y - 28}
                        width="70"
                        height="56"
                        rx="10"
                        fill={inFlow ? flowColor : '#fff'}
                        stroke={inFlow ? flowColor : '#F87171'}
                        strokeWidth={inFlow ? 2 : 2}
                        strokeDasharray={inFlow ? "0" : "4,2"}
                        style={{ transition: 'all 0.2s ease' }}
                      />
                      <text x={contract.x} y={contract.y - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={inFlow ? '#fff' : '#374151'}>IPFS</text>
                      <text x={contract.x} y={contract.y + 12} textAnchor="middle" fontSize="8" fill={inFlow ? 'rgba(255,255,255,0.8)' : '#9CA3AF'}>Pinata</text>
                    </>
                  ) : (
                    <>
                      <rect
                        x={contract.x - 52}
                        y={contract.y - 26}
                        width="104"
                        height="52"
                        rx="8"
                        fill={inFlow ? flowColor : '#fff'}
                        stroke={inFlow ? flowColor : '#D1D5DB'}
                        strokeWidth={inFlow ? 2 : 1}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: inFlow ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none'
                        }}
                      />
                      <text
                        x={contract.x}
                        y={contract.y - 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill={inFlow ? '#fff' : '#374151'}
                      >
                        {contract.name}
                      </text>
                      <text
                        x={contract.x}
                        y={contract.y + 10}
                        textAnchor="middle"
                        fontSize="8"
                        fill={inFlow ? 'rgba(255,255,255,0.8)' : '#9CA3AF'}
                      >
                        {contract.subtitle}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Special: Settle Dispute outward arrow from CCTP Local */}
            {isFlowActive('settleDispute') && (
              <g>
                {/* Arrow from cctpLocal pointing up/outward */}
                <line
                  x1={contracts.cctpLocal.x}
                  y1={contracts.cctpLocal.y - 26}
                  x2={contracts.cctpLocal.x}
                  y2={contracts.cctpLocal.y - 70}
                  stroke={flows.settleDispute.color}
                  strokeWidth="3"
                  strokeOpacity="0.9"
                  markerEnd="url(#arrow-settleDispute)"
                />
                {/* Label */}
                <text
                  x={contracts.cctpLocal.x}
                  y={contracts.cctpLocal.y - 80}
                  fontSize="10"
                  fontWeight="600"
                  fill={flows.settleDispute.color}
                  textAnchor="middle"
                >
                  To Winner Wallet
                </text>
              </g>
            )}

            {/* Connection labels */}
            <g fontSize="8" fill="#9CA3AF" fontWeight="500">
              <text x="440" y="275" textAnchor="middle">LayerZero V2</text>
              <text x="440" y="115" textAnchor="middle">Circle CCTP</text>
              <text x="420" y="605" textAnchor="middle">LayerZero V2</text>
            </g>
          </svg>

          {/* Flow Path Detail Panel */}
          {(selectedFlow || hoveredFlow) && (
            <div style={{
              position: 'fixed',
              top: '80px',
              left: '300px',
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #E5E7EB',
              maxWidth: '600px',
              zIndex: 100
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: flows[selectedFlow || hoveredFlow]?.color
                }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>
                  {flows[selectedFlow || hoveredFlow]?.name}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#666',
                  backgroundColor: '#F3F4F6',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {userTypes[flows[selectedFlow || hoveredFlow]?.userType]?.icon} {userTypes[flows[selectedFlow || hoveredFlow]?.userType]?.name}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                {flows[selectedFlow || hoveredFlow]?.description}
              </div>
              {/* Show parallel paths for flows with multiple paths */}
              {flows[selectedFlow || hoveredFlow]?.paths ? (
                flows[selectedFlow || hoveredFlow].paths.map((singlePath, pathIdx) => (
                  <div key={pathIdx} style={{ marginBottom: pathIdx < flows[selectedFlow || hoveredFlow].paths.length - 1 ? '8px' : '0' }}>
                    <div style={{ fontSize: '9px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                      Path {pathIdx + 1}: {pathIdx === 0 ? 'LayerZero (Job Data)' : 'CCTP (USDC)'}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      backgroundColor: '#F9FAFB',
                      padding: '8px 10px',
                      borderRadius: '6px'
                    }}>
                      {singlePath.map((p, i) => (
                        <React.Fragment key={i}>
                          <span style={{
                            backgroundColor: '#fff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #E5E7EB',
                            fontWeight: '500'
                          }}>
                            {contracts[p]?.name || p}
                          </span>
                          {i < singlePath.length - 1 && (
                            <span style={{ color: flows[selectedFlow || hoveredFlow]?.color }}>→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  fontSize: '10px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  backgroundColor: '#F9FAFB',
                  padding: '8px 10px',
                  borderRadius: '6px'
                }}>
                  {flows[selectedFlow || hoveredFlow]?.path.map((p, i) => (
                    <React.Fragment key={i}>
                      <span style={{
                        backgroundColor: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid #E5E7EB',
                        fontWeight: '500'
                      }}>
                        {contracts[p]?.name || p}
                      </span>
                      {i < flows[selectedFlow || hoveredFlow].path.length - 1 && (
                        <span style={{ color: flows[selectedFlow || hoveredFlow]?.color }}>→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserFlowsOverview;
