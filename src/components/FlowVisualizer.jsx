import React, { useState, useEffect } from 'react';
import './FlowVisualizer.css';

const FlowVisualizer = ({ flowData }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedStep, setSelectedStep] = useState(null);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= flowData.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, (2000 / speed));

    return () => clearInterval(interval);
  }, [isPlaying, speed, flowData.steps.length]);

  const handlePlayPause = () => {
    if (currentStep >= flowData.steps.length - 1 && !isPlaying) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleStepClick = (index) => {
    setCurrentStep(index);
    setSelectedStep(index);
    setIsPlaying(false);
  };

  const getChainColor = (chain) => {
    switch (chain) {
      case 'ethereum':
        return '#627eea';
      case 'arbitrum':
        return '#28a0f0';
      case 'layerzero':
        return '#7c3aed';
      case 'all':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getChainIcon = (chain) => {
    switch (chain) {
      case 'ethereum':
        return '🟣';
      case 'arbitrum':
        return '🔵';
      case 'layerzero':
        return '⚡';
      case 'all':
        return '🌐';
      default:
        return '🔗';
    }
  };

  const currentStepData = flowData.steps[currentStep];
  const selectedStepData = selectedStep !== null ? flowData.steps[selectedStep] : currentStepData;

  return (
    <div className="flow-visualizer-horizontal">
      {/* Header */}
      <div className="flow-header-compact">
        <div className="flow-title-section-compact">
          <h2 className="flow-title-compact">
            <span className="flow-icon">{flowData.icon}</span>
            {flowData.title}
          </h2>
          <p className="flow-description-compact">{flowData.description}</p>
        </div>
        
        <div className="flow-meta-compact">
          <div className="meta-badge">⚡ {flowData.complexity}</div>
          <div className="meta-badge">⏱️ {flowData.estimatedTime}</div>
          <div className="meta-badge">⛽ {flowData.totalGasEstimate}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flow-controls-compact">
        <div className="playback-controls">
          <button
            className="control-btn play-btn"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="control-btn reset-btn"
            onClick={handleReset}
            title="Reset"
          >
            ↻
          </button>
          <div className="speed-control">
            <label htmlFor="speed">Speed:</label>
            <select
              id="speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="speed-select"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        <div className="current-step-indicator">
          Step {currentStep + 1} of {flowData.steps.length}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="timeline-container">
        <div className="timeline-scroll">
          {flowData.steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isSelected = index === selectedStep;
            const chainColor = getChainColor(step.chain);
            const chainIcon = getChainIcon(step.chain);

            return (
              <React.Fragment key={index}>
                <div
                  className={`timeline-step ${isActive ? 'active' : ''} ${
                    isCompleted ? 'completed' : ''
                  } ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleStepClick(index)}
                  style={{
                    borderColor: isActive || isSelected ? chainColor : undefined
                  }}
                >
                  <div
                    className="timeline-step-number"
                    style={{
                      backgroundColor: isActive || isSelected ? chainColor : undefined
                    }}
                  >
                    {isCompleted ? '✓' : step.step}
                  </div>
                  
                  <div className="timeline-step-chain" style={{ color: chainColor }}>
                    {chainIcon} {step.chainLabel}
                  </div>
                  
                  <div className="timeline-step-icon">{step.icon}</div>
                  
                  <div className="timeline-step-title">{step.contract}</div>
                  
                  <div className="timeline-step-action">{step.action}</div>
                  
                  {step.gasEstimate && (
                    <div className="timeline-step-gas">⛽ {step.gasEstimate}</div>
                  )}
                </div>

                {index < flowData.steps.length - 1 && (
                  <div className={`timeline-arrow ${isActive ? 'active' : ''}`}>
                    →
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Step Details Panel */}
      <div className="step-details-panel">
        <div className="step-details-header">
          <div className="step-details-meta">
            <span
              className="step-details-chain-badge"
              style={{
                backgroundColor: getChainColor(selectedStepData.chain)
              }}
            >
              {getChainIcon(selectedStepData.chain)} {selectedStepData.chainLabel}
            </span>
            <span className="step-details-actor">Actor: {selectedStepData.actor}</span>
          </div>
          <h3 className="step-details-title">
            {selectedStepData.icon} {selectedStepData.contract}
          </h3>
        </div>

        <div className="step-details-content">
          <div className="step-details-section">
            <h4 className="step-details-section-title">Action</h4>
            <p className="step-details-action">{selectedStepData.action}</p>
            <p className="step-details-description">{selectedStepData.description}</p>
          </div>

          {selectedStepData.details && selectedStepData.details.length > 0 && (
            <div className="step-details-section">
              <h4 className="step-details-section-title">What Happens:</h4>
              <ul className="step-details-list">
                {selectedStepData.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedStepData.emittedEvents && selectedStepData.emittedEvents.length > 0 && (
            <div className="step-details-section">
              <h4 className="step-details-section-title">📡 Events Emitted:</h4>
              <div className="step-details-events">
                {selectedStepData.emittedEvents.map((event, idx) => (
                  <code key={idx} className="event-code">{event}</code>
                ))}
              </div>
            </div>
          )}

          {selectedStepData.codeSnippet && (
            <div className="step-details-section">
              <h4 className="step-details-section-title">💻 Code Example:</h4>
              <pre className="step-details-code">
                <code>{selectedStepData.codeSnippet}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="key-takeaways-compact">
        <h3 className="takeaways-title">🎯 Key Takeaways</h3>
        <div className="takeaways-grid">
          {flowData.keyTakeaways.map((takeaway, index) => (
            <div key={index} className="takeaway-card">
              ✓ {takeaway}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flow-summary">
        <div className="summary-stat">
          <div className="summary-label">Contracts</div>
          <div className="summary-value">{flowData.contracts.length}</div>
        </div>
        <div className="summary-stat">
          <div className="summary-label">Chains</div>
          <div className="summary-value">{flowData.chains.length}</div>
        </div>
        <div className="summary-stat">
          <div className="summary-label">Steps</div>
          <div className="summary-value">{flowData.steps.length}</div>
        </div>
        <div className="summary-stat">
          <div className="summary-label">Total Time</div>
          <div className="summary-value">{flowData.estimatedTime}</div>
        </div>
      </div>
    </div>
  );
};

export default FlowVisualizer;
