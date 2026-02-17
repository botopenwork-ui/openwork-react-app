import React from 'react';
import './ProfileSection.css';

const ProfileSection = () => {
  const handleSetProfile = () => {
    document.getElementById('lp-2-section').scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  return (
    <section id="lp-2-section" className="lp-section lp-2-section">
      <div className="lp-2-container">
        {/* Left Content */}
        <div className="lp-2-content">
          <div className="text-content">
            <h1 className="lp-2-heading">Your Profile is Your Identity</h1>
            <p className="lp-2-description">
              Create a verifiable profile using your wallet. All data is stored on IPFS and the blockchain—completely owned and controlled by you.
            </p>
          </div>
          
          <button 
            className="lp-blue-button"
            onClick={handleSetProfile}
          >
            Set Your Profile
            <img src="/assets/b16a6ff87b2913f8bdc303dda7816c024bd687cb.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        {/* Right Content - Profile Circle */}
        <div className="profile-circle-section">
          <div className="profile-circle-group">
            {/* Radiant Glow */}
            <div className="profile-radiant-glow">
              <img src="/assets/f01626b372dd2b2391f5fe54c12ae2256c1f5afb.svg" alt="" />
              <img src="/assets/091c505d411eb57b9f1d9290b4460a2192f03cba.svg" alt="" className="glow-overlay" />
            </div>
            
            {/* Main Circle */}
            <img 
              src="/assets/300d7ce82be9f924ea45b3f5b13e3886ae2e040b.svg" 
              alt="" 
              className="profile-circle-bg"
            />

            {/* Left Button - About */}
            <div className="radial-button radial-button-left">
              <div className="radial-button-content">
                <img src="/assets/081d3bfdc15b7ac4902803ad1728684196fe82ca.svg" alt="About" />
                <span>About</span>
              </div>
            </div>

            {/* Right Button - Jobs */}
            <div className="radial-button radial-button-right">
              <div className="radial-button-content">
                <img src="/assets/bb51c34d86b51b6cc653f8826f3a8f5c05028d96.svg" alt="Jobs" />
                <span>Jobs</span>
              </div>
            </div>

            {/* Center Profile */}
            <div className="center-profile">
              <div className="profile-avatar">
                <img src="/assets/3d90d978da202913302b7c506fa777f428500cc6.png" alt="Profile" />
              </div>
              <div className="profile-rating">
                <span className="rating-text">4.9</span>
                <div className="star-icon">
                  <img src="/assets/c88d1ccb13275217d5fa8cc23be07c290ae77d34.svg" alt="" className="star-bg" />
                  <img src="/assets/721e043aefa6d0dae1674935f768680ab6f3a4f2.svg" alt="" className="star" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileSection;
