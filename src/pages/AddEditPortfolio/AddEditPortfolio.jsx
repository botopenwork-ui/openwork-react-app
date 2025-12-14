import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { 
  uploadFileToIPFS, 
  uploadJSONToIPFS, 
  addPortfolioToBlockchain,
  updatePortfolioOnBlockchain 
} from "../../services/portfolioService";
import BlueButton from "../../components/BlueButton/BlueButton";
import Button from "../../components/Button/Button";
import "./AddEditPortfolio.css";

export default function AddEditPortfolio() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { walletAddress } = useWalletConnection();
  
  const isEditMode = !!id;
  const existingData = location.state?.portfolioData;

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);

  const [projectName, setProjectName] = useState(existingData?.title || "Project Name");
  const [description, setDescription] = useState(existingData?.description || "");
  const [skills, setSkills] = useState(existingData?.skills || ["UX Design", "UI Design"]);
  const [images, setImages] = useState(existingData?.images || []);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  function formatWalletAddress(address) {
    if (!address) return "0xfd08...024a";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}...${end}`;
  }

  const handleCopyToClipboard = () => {
    const address = walletAddress || "0xfd08...024a";
    navigator.clipboard.writeText(address);
  };

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadFileToIPFS(file));
      const ipfsHashes = await Promise.all(uploadPromises);
      setImages([...images, ...ipfsHashes]);
      console.log('✅ Images uploaded to IPFS:', ipfsHashes);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleChangeImage = async (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setUploadingImages(true);
        try {
          const ipfsHash = await uploadFileToIPFS(file);
          const updatedImages = [...images];
          updatedImages[index] = ipfsHash;
          setImages(updatedImages);
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image.');
        } finally {
          setUploadingImages(false);
        }
      }
    };
    input.click();
  };

  const handleDeleteImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    if (selectedImage >= updatedImages.length) {
      setSelectedImage(Math.max(0, updatedImages.length - 1));
    }
  };

  const handleSave = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!projectName.trim() || projectName === "Project Name") {
      alert("Please enter a project name");
      return;
    }

    if (images.length === 0) {
      alert("Please add at least one image");
      return;
    }

    setLoading(true);

    try {
      const portfolioData = {
        title: projectName,
        description: description,
        skills: skills,
        images: images,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('📤 Uploading portfolio data to IPFS...');
      const portfolioHash = await uploadJSONToIPFS(
        portfolioData,
        `portfolio-${projectName.replace(/\s+/g, '-')}-${Date.now()}.json`
      );

      console.log('✅ Portfolio data uploaded to IPFS:', portfolioHash);

      if (isEditMode) {
        await updatePortfolioOnBlockchain(walletAddress, parseInt(id), portfolioHash);
        alert('Portfolio updated successfully!');
      } else {
        await addPortfolioToBlockchain(walletAddress, portfolioHash);
        alert('Portfolio created successfully!');
      }

      navigate("/profile-portfolio");
    } catch (error) {
      console.error("Error saving portfolio:", error);
      alert(`Failed to save portfolio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addedit-portfolio-wrapper">
      <div className="addedit-portfolio-container">
        
        {/* Header Section - Outside any card */}
        <div className="addedit-header-section">
          <button className="addedit-back-button" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15.8332 10.0003H4.1665M4.1665 10.0003L9.99984 15.8337M4.1665 10.0003L9.99984 4.16699" 
                    stroke="#767676" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="addedit-title-section">
            {isEditingName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                className="addedit-title-input"
                autoFocus
              />
            ) : (
              <h1 className="addedit-title">
                {projectName}
                <img 
                  src="/edit.svg" 
                  alt="Edit" 
                  className="addedit-edit-icon"
                  onClick={() => setIsEditingName(true)}
                />
              </h1>
            )}
            <div className="addedit-contract-row">
              <span>Contract ID: {formatWalletAddress(walletAddress)}</span>
              <img 
                src="/copy.svg" 
                className="addedit-copy-icon" 
                onClick={handleCopyToClipboard}
                alt="Copy"
              />
            </div>
          </div>
        </div>

        {/* Skills Bar - Horizontal row */}
        <div className="addedit-skills-bar">
          {skills.map((skill, index) => (
            <div key={index} className="addedit-skill-badge">{skill}</div>
          ))}
          <Button label="Change" buttonCss="addedit-change-btn" />
          <Button label="Delete" buttonCss="addedit-delete-btn" />
        </div>

        {/* Image Upload/Display Card - Separate white box */}
        <div className="addedit-image-card">
          {images.length > 0 ? (
            <>
              <div className="addedit-main-image">
                <img
                  src={`https://gateway.pinata.cloud/ipfs/${images[selectedImage]}`}
                  alt="Work preview"
                />
                <div className="image-overlay-actions">
                  <Button 
                    label="Change"
                    buttonCss="addedit-change-btn"
                    onClick={() => handleChangeImage(selectedImage)}
                  />
                  <Button 
                    label="Delete"
                    buttonCss="addedit-delete-btn"
                    onClick={() => handleDeleteImage(selectedImage)}
                  />
                </div>
              </div>

              {/* Gallery Thumbnails */}
              <div className="addedit-image-gallery">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`gallery-thumbnail ${selectedImage === index ? "active" : ""}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={`https://gateway.pinata.cloud/ipfs/${image}`} alt={`Thumbnail ${index + 1}`} />
                  </div>
                ))}
                <div 
                  className="gallery-add-more"
                  onClick={() => {
                    console.log('Add more clicked!');
                    addMoreInputRef.current?.click();
                  }}
                >
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div className="add-more-label">
                    <img src="/plus.svg" alt="Add" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div 
              className="addedit-upload-area" 
              onClick={() => {
                console.log('Upload area clicked!');
                fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <div className="upload-label">
                <img src="/upload-icon.svg" alt="Upload" />
                <span>Click to upload images</span>
              </div>
            </div>
          )}
        </div>

        {/* Description Card - Separate white box */}
        <div className="addedit-description-card">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter project description..."
            className="description-textarea"
          />
        </div>

        {/* Submit Button */}
        <div className="addedit-submit-section">
          <BlueButton
            label={loading ? "Saving..." : "Send changes"}
            onClick={handleSave}
            disabled={loading}
          />
        </div>

      </div>
    </div>
  );
}
