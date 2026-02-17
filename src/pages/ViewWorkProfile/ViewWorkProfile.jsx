import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { fetchUserPortfolios } from "../../services/portfolioService";
import "./ViewWorkProfile.css";

export default function ViewWorkProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { walletAddress } = useWalletConnection();
  const [selectedImage, setSelectedImage] = useState(0);
  const [workData, setWorkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);

  // Fetch portfolio item from blockchain
  useEffect(() => {
    const loadPortfolioItem = async () => {
      if (!walletAddress || !id) {
        setLoading(false);
        return;
      }

      try {
        const portfolios = await fetchUserPortfolios(walletAddress);
        const portfolio = portfolios.find(p => p.id === parseInt(id));
        
        if (portfolio) {
          setWorkData({
            title: portfolio.title,
            userName: "molliehall2504",
            packageType: portfolio.packageType || "Webflow Package",
            skills: portfolio.skills || [],
            images: portfolio.images || [],
            description: portfolio.description || ""
          });
        }
      } catch (error) {
        console.error('Error loading portfolio item:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolioItem();
  }, [walletAddress, id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#868686' }}>
        Loading portfolio item...
      </div>
    );
  }

  if (!workData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#868686' }}>
        Portfolio item not found
      </div>
    );
  }

  const remainingSkillsCount = workData.skills.length - 1;

  return (
    <div className="viewwork-wrapper">
      {/* Main Card Container */}
      <div className="viewwork-card">
        {/* Back Button */}
        <button className="viewwork-back-button" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15.8332 10.0003H4.1665M4.1665 10.0003L9.99984 15.8337M4.1665 10.0003L9.99984 4.16699" stroke="#767676" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Title and User Info */}
        <div className="viewwork-title-section">
          <h1 className="viewwork-title">{workData.title}</h1>
          <div className="viewwork-user-info">
            <img src="/avatar.svg" alt="User" className="viewwork-avatar" />
            <span className="viewwork-username">{workData.userName}</span>
            <span className="viewwork-separator">•</span>
            <span className="viewwork-package">{workData.packageType}</span>
          </div>
        </div>

        {/* Skills Badges - Top Right */}
        <div className="viewwork-skills-badges">
          {workData.skills.length > 0 && (
            <>
              <div className="viewwork-badge">{workData.skills[0]}</div>
              {remainingSkillsCount > 0 && (
                <div className="viewwork-more-badge-wrapper">
                  <button 
                    className="viewwork-badge viewwork-badge-clickable"
                    onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                  >
                    +{remainingSkillsCount} More
                  </button>
                  {showSkillsDropdown && (
                    <div className="viewwork-skills-dropdown">
                      <div className="viewwork-dropdown-arrow"></div>
                      <div className="viewwork-dropdown-content">
                        {workData.skills.map((skill, index) => (
                          <div key={index} className="viewwork-dropdown-badge">
                            {skill}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Main Image */}
        <div className="viewwork-main-image">
          <img
            src={`https://gateway.lighthouse.storage/ipfs/${workData.images[selectedImage]}`}
            alt="Work preview"
          />
        </div>

        {/* Gallery Thumbnails */}
        <div className="viewwork-gallery">
          {workData.images.map((image, index) => (
            <div
              key={index}
              className={`viewwork-thumbnail ${selectedImage === index ? "active" : ""}`}
              onClick={() => setSelectedImage(index)}
            >
              <img src={`https://gateway.lighthouse.storage/ipfs/${image}`} alt={`Thumbnail ${index + 1}`} />
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="viewwork-description">{workData.description}</p>
      </div>
    </div>
  );
}
