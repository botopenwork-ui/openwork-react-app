import React from 'react';
import './CircleGlow.css';

const CircleGlow = ({ 
  size = 'medium', 
  glowImage1, 
  glowImage2, 
  circleImage,
  className = '',
  children 
}) => {
  return (
    <div className={`circle-glow-container ${className}`}>
      {/* Radiant Glow */}
      {(glowImage1 || glowImage2) && (
        <div className="radiant-glow-wrapper">
          {glowImage1 && (
            <img 
              src={glowImage1} 
              alt="" 
              className="glow-layer glow-layer-1"
            />
          )}
          {glowImage2 && (
            <img 
              src={glowImage2} 
              alt="" 
              className="glow-layer glow-layer-2"
            />
          )}
        </div>
      )}
      
      {/* Main Circle */}
      {circleImage && (
        <img 
          src={circleImage} 
          alt="" 
          className="main-circle-image"
        />
      )}

      {/* Children content (center elements, avatars, etc.) */}
      {children}
    </div>
  );
};

export default CircleGlow;
