import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { fetchUserPortfolios } from "../../services/portfolioService";
import BackButton from "../../components/BackButton/BackButton";
import "./ViewWorkProfile.css";

export default function ViewWorkProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { walletAddress } = useWalletConnection();
  const [selectedImage, setSelectedImage] = useState(0);
  const [workData, setWorkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllSkills, setShowAllSkills] = useState(false);

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
            userName: "molliehall2504", // TODO: Get from user profile
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

  const visibleSkills = showAllSkills ? workData.skills : workData.skills.slice(0, 1);
  const remainingSkillsCount = workData.skills.length - 1;

  return (
    <div className="viewwork-page-wrapper">
      <div className="viewwork-container">
        {/* Header Section */}
        <div className="viewwork-header-section">
          <div className="viewwork-title-row">
            <BackButton to="/profile-portfolio" title={workData.title} />
          </div>
          <div className="viewwork-user-row">
            <div className="viewwork-user-info">
              <img src="/avatar.svg" alt="User" className="viewwork-user-avatar" />
              <span className="viewwork-user-name">{workData.userName}</span>
              <span className="viewwork-user-separator">•</span>
              <span className="viewwork-user-package">{workData.packageType}</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="viewwork-content">
          {/* Header Bar with Skills */}
          <div className="viewwork-header-bar">
            <div className="viewwork-skills-section">
              {visibleSkills.map((skill, index) => (
                <button key={index} className="viewwork-skill-badge">
                  {skill}
                </button>
              ))}
              {remainingSkillsCount > 0 && !showAllSkills && (
                <button 
                  className="viewwork-more-button"
                  onClick={() => setShowAllSkills(true)}
                >
                  +{remainingSkillsCount} More
                </button>
              )}
            </div>
          </div>

          {/* Main Image Display */}
          <div className="viewwork-main-image">
            <img
              src={`https://gateway.pinata.cloud/ipfs/${workData.images[selectedImage]}`}
              alt="Work preview"
              className="main-image"
            />
          </div>

          {/* Image Gallery Thumbnails */}
          <div className="viewwork-image-gallery">
            {workData.images.map((image, index) => (
              <div
                key={index}
                className={`gallery-thumbnail ${selectedImage === index ? "active" : ""}`}
                onClick={() => setSelectedImage(index)}
              >
                <img src={`https://gateway.pinata.cloud/ipfs/${image}`} alt={`Thumbnail ${index + 1}`} />
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="viewwork-description">
            <p>{workData.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
