import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { fetchUserPortfolios, deletePortfolioFromBlockchain } from "../../services/portfolioService";
import BlueButton from "../../components/BlueButton/BlueButton";
import Button from "../../components/Button/Button";
import "./ProfilePortfolioOwner.css";

export default function ProfilePortfolioOwner() {
  const navigate = useNavigate();
  const { walletAddress } = useWalletConnection();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("All Skills");
  const [openCardDropdown, setOpenCardDropdown] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const skillOptions = [
    "All Skills",
    "UX Design",
    "Web Development",
    "Shopify"
  ];

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

  const handleEdit = (item) => {
    console.log("Edit item:", item.id);
    setOpenCardDropdown(null);
    navigate(`/edit-portfolio/${item.id}`, {
      state: {
        portfolioData: item
      }
    });
  };

  const handleDelete = (itemId) => {
    console.log("Delete item:", itemId);
    setOpenCardDropdown(null);
    // Add delete logic here
  };

  const handleAddProject = () => {
    navigate("/add-portfolio");
  };

  // Fetch portfolio items from blockchain
  useEffect(() => {
    const loadPortfolios = async () => {
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const portfolios = await fetchUserPortfolios(walletAddress);
        setPortfolioItems(portfolios);
      } catch (err) {
        console.error('Error loading portfolios:', err);
        setError('Failed to load portfolios');
      } finally {
        setLoading(false);
      }
    };

    loadPortfolios();
  }, [walletAddress]);

  const handleDeleteConfirm = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this portfolio item?')) {
      return;
    }

    try {
      setLoading(true);
      await deletePortfolioFromBlockchain(walletAddress, itemId);
      
      // Refresh portfolio list
      const portfolios = await fetchUserPortfolios(walletAddress);
      setPortfolioItems(portfolios);
      
      alert('Portfolio item deleted successfully!');
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <div className="newTitle">
        <div className="titleTop">
          <Link className="goBack" to={`/profile`}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </Link>  
          <div className="titleText">molliehall2504</div>
        </div>
        <div className="titleBottom">
          <p>Contract ID: {formatWalletAddress("0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}</p>
          <img 
            src="/copy.svg" 
            className="copyImage" 
            onClick={() => handleCopyToClipboard("0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}
          />
        </div>
      </div>
      
      <div className="portfolio-page-wrapper">
        <div className="portfolio-content">

        <div className="portfolio-header-bar">
          <h2 className="portfolio-title">Portfolio</h2>
          
          <div className="filter-dropdown">
            <button 
              className="filter-dropdown-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedSkill}</span>
              <img src="/array.svg" alt="Filter" />
            </button>
            {isDropdownOpen && (
              <ul className="filter-dropdown-menu">
                {skillOptions.map((skill, index) => (
                  <React.Fragment key={index}>
                    <li
                      className="filter-dropdown-item"
                      onClick={() => {
                        setSelectedSkill(skill);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {skill}
                    </li>
                    {index !== skillOptions.length - 1 && (
                      <span className="filter-dropdown-line" />
                    )}
                  </React.Fragment>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#868686' }}>
            Loading portfolios...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
            {error}
          </div>
        )}

        {/* Portfolio Grid */}
        {!loading && !error && (
          <div className="portfolio-grid portfolio-grid-owner">
            {/* Add Project Card */}
            <div className="portfolio-card portfolio-card-add">
              <BlueButton 
                label="Add Project" 
                onClick={handleAddProject}
                icon="/assets/plus-icon.svg"
              />
            </div>

            {/* Portfolio Items */}
            {portfolioItems.map((item) => (
            <div key={item.id} className="portfolio-card">
              <div 
                className="portfolio-card-image"
                onClick={() => navigate(`/view-work-profile/${item.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {item.images && item.images.length > 0 ? (
                  <img 
                    src={`https://gateway.pinata.cloud/ipfs/${item.images[0]}`} 
                    alt={item.title || 'Portfolio item'} 
                  />
                ) : (
                  <div className="portfolio-card-image-placeholder">
                    <img src="/assets/document-icon.svg" alt="No image" />
                  </div>
                )}
              </div>
              
              <div className="portfolio-card-content">
                <div className="portfolio-card-info">
                  <h3 className="portfolio-card-title">{item.title}</h3>
                  
                  <div className="portfolio-card-badges">
                    {item.skills.map((skill, index) => (
                      <span key={index} className="portfolio-badge">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Owner Actions */}
                <div className="portfolio-card-actions">
                  <Button 
                    label="Edit"
                    icon="/assets/edit-icon.svg"
                    onClick={() => handleEdit(item)}
                    buttonCss="portfolio-action-edit"
                  />
                  <Button 
                    icon="/assets/delete-icon.svg"
                    onClick={() => handleDeleteConfirm(item.id)}
                    buttonCss="portfolio-action-delete"
                  />
                </div>
              </div>
            </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="portfolio-pagination">
          <button className="portfolio-pagination-button prev">
            <img src="/back.svg" alt="Previous" />
          </button>
          <span className="portfolio-page-info">Page 1 of 1</span>
          <button className="portfolio-pagination-button next">
            <img src="/front.svg" alt="Next" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
