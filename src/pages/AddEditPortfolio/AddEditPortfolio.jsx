import React, { useState, useEffect } from "react";
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
  const { id } = useParams(); // For edit mode
  const location = useLocation();
  const { walletAddress } = useWalletConnection();
  
  const isEditMode = !!id;
  const existingData = location.state?.portfolioData;

  // Form state
  const [projectName, setProjectName] = useState(existingData?.title || "");
  const [description, setDescription] = useState(existingData?.description || "");
  const [skills, setSkills] = useState(existingData?.skills || []);
  const [images, setImages] = useState(existingData?.images || []); // IPFS hashes
  const [imageFiles, setImageFiles] = useState([]); // Actual file objects
  const [selectedImage, setSelectedImage] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

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

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      // Upload each file to IPFS
      const uploadPromises = Array.from(files).map(file => uploadFileToIPFS(file));
      const ipfsHashes = await Promise.all(uploadPromises);
      
      // Add IPFS hashes to images array
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
          // Upload to IPFS
          const ipfsHash = await uploadFileToIPFS(file);
          const updatedImages = [...images];
          updatedImages[index] = ipfsHash;
          setImages(updatedImages);
          console.log('✅ Image replaced with IPFS hash:', ipfsHash);
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image. Please try again.');
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

    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    if (images.length === 0) {
      alert("Please add at least one image");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create portfolio JSON object
      const portfolioData = {
        title: projectName,
        description: description,
        skills: skills,
        images: images, // Already IPFS hashes
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Step 2: Upload portfolio JSON to IPFS
      console.log('📤 Uploading portfolio data to IPFS...');
      const portfolioHash = await uploadJSONToIPFS(
        portfolioData,
        `portfolio-${projectName.replace(/\s+/g, '-')}-${Date.now()}.json`
      );

      console.log('✅ Portfolio data uploaded to IPFS:', portfolioHash);

      // Step 3: Add/Update portfolio on blockchain
      if (isEditMode) {
        console.log('🔄 Updating portfolio on blockchain...');
        await updatePortfolioOnBlockchain(walletAddress, parseInt(id), portfolioHash);
        alert('Portfolio updated successfully!');
      } else {
        console.log('➕ Adding portfolio to blockchain...');
        await addPortfolioToBlockchain(walletAddress, portfolioHash);
        alert('Portfolio created successfully!');
      }

      // Navigate back to portfolio page
      navigate("/profile-portfolio");
    } catch (error) {
      console.error("Error saving portfolio:", error);
      alert(`Failed to save portfolio: ${error.message}`);
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
          <button className="goBack" onClick={handleBack}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </button>
          <div className="titleText-editable">
            {isEditingName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                autoFocus
                className="project-name-input"
                placeholder="Enter project name"
              />
            ) : (
              <>
                <span>{projectName || "Project Name"}</span>
                <img 
                  src="/edit.svg" 
                  alt="Edit" 
                  className="edit-icon"
                  onClick={() => setIsEditingName(true)}
                />
              </>
            )}
          </div>
        </div>
        <div className="titleBottom">
          <p>Contract ID: {formatWalletAddress(walletAddress || "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}</p>
          <img 
            src="/copy.svg" 
            className="copyImage" 
            onClick={() => handleCopyToClipboard(walletAddress || "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}
            alt="Copy"
          />
        </div>
      </div>

      <div className="addedit-portfolio-wrapper">
        <div className="addedit-portfolio-content">
          {/* Action Buttons Row */}
          <div className="addedit-action-bar">
            <div className="addedit-badges">
              {skills.map((skill, index) => (
                <span key={index} className="addedit-badge">
                  {skill}
                </span>
              ))}
            </div>
            <div className="addedit-action-buttons">
              <Button 
                label="Change"
                buttonCss="addedit-change-btn"
                onClick={() => {/* TODO: Implement skill selection */}}
              />
              <Button 
                label="Delete"
                buttonCss="addedit-delete-btn"
                onClick={() => {/* TODO: Implement skill deletion */}}
              />
            </div>
          </div>

          {/* Main Image Display */}
          {images.length > 0 ? (
            <div className="addedit-main-image">
              <img
                src={`https://gateway.pinata.cloud/ipfs/${images[selectedImage]}`}
                alt="Work preview"
                className="main-image"
              />
              <div className="image-overlay-actions">
                <Button 
                  label="Change"
                  buttonCss="image-change-btn"
                  onClick={() => handleChangeImage(selectedImage)}
                />
                <Button 
                  label="Delete"
                  buttonCss="image-delete-btn"
                  onClick={() => handleDeleteImage(selectedImage)}
                />
              </div>
            </div>
          ) : (
            <div className="addedit-upload-area">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                id="image-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="image-upload" className="upload-label">
                <img src="/upload-icon.svg" alt="Upload" />
                <span>Click to upload images</span>
              </label>
            </div>
          )}

          {/* Image Gallery Thumbnails */}
          {images.length > 0 && (
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
              <div className="gallery-add-more">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  id="add-more-images"
                  style={{ display: 'none' }}
                />
                <label htmlFor="add-more-images" className="add-more-label">
                  <img src="/plus.svg" alt="Add" />
                </label>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="addedit-description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description..."
              className="description-textarea"
              rows={8}
            />
          </div>

          {/* Save Button */}
          <div className="addedit-submit-section">
            <BlueButton
              label={loading ? "Saving..." : "Send changes"}
              onClick={handleSave}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
