import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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

  const handleCopyToClipboard = (address) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        alert("Address copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

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
            packageType: portfolio.packageType || "",
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

  const handleBack = () => {
    navigate(-1);
  };

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

  return (
    <>
      <div className="newTitle">
        <div className="titleTop">
          <button className="goBack" onClick={handleBack}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </button>
          <div className="titleText">{workData.title}</div>
        </div>
        <div className="titleBottom">
          <div className="user-info">
            <img src="/avatar.png" alt="User" className="user-avatar" />
            <div className="user-details">
              <span className="user-name">{workData.userName}</span>
              <span className="user-separator">•</span>
              <span className="user-package">{workData.packageType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="viewwork-page-wrapper">
        <div className="viewwork-content">
          {/* Header with badges */}
          <div className="viewwork-header-bar">
            <div className="viewwork-badges">
              {workData.skills.map((skill, index) => (
                <span key={index} className="viewwork-badge">
                  {skill}
                </span>
              ))}
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
    </>
  );
}
