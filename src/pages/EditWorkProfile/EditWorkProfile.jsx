import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./EditWorkProfile.css";

export default function EditWorkProfile() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  const [showSkillTooltip, setShowSkillTooltip] = useState(false);
  const [title, setTitle] = useState("Project Name");
  const [tempTitle, setTempTitle] = useState("Project Name");
  const [skills, setSkills] = useState(["UX Design", "Product Design", "Webflow"]);
  const [tempSkills, setTempSkills] = useState(["UX Design", "Product Design", "Webflow"]);
  const [description, setDescription] = useState(`Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`);

  const [images, setImages] = useState([
    "/assets/portfolio-1.png",
    "/assets/portfolio-2.png",
    "/assets/portfolio-3.png",
    "/assets/portfolio-4.png",
  ]);

  const workData = {
    userName: "molliehall2504",
    packageType: "Webflow Package",
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSaveTitleChanges = () => {
    setTitle(tempTitle);
    setShowTitleTooltip(false);
  };

  const handleSaveSkillChanges = () => {
    setSkills(tempSkills);
    setShowSkillTooltip(false);
  };

  const handleRemoveTempSkill = (skillToRemove) => {
    setTempSkills(tempSkills.filter(skill => skill !== skillToRemove));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages([...images, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = (indexToDelete) => {
    const newImages = images.filter((_, index) => index !== indexToDelete);
    setImages(newImages);
    if (selectedImage >= newImages.length) {
      setSelectedImage(Math.max(0, newImages.length - 1));
    }
  };

  const handleSaveChanges = () => {
    console.log("Saving changes:", { title, skills, description, images });
    alert("Changes saved successfully!");
  };

  return (
    <>
      <div className="newTitle">
        <div className="titleTop">
          <button className="goBack" onClick={handleBack}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </button>
          <div className="title-wrapper">
            <div className="titleText">{title}</div>
            <button className="edit-icon-btn" onClick={() => setShowTitleTooltip(!showTitleTooltip)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.33333 2.66667H2.66667C2.31305 2.66667 1.97391 2.80714 1.72386 3.05719C1.47381 3.30724 1.33333 3.64638 1.33333 4V13.3333C1.33333 13.687 1.47381 14.0261 1.72386 14.2761C1.97391 14.5262 2.31305 14.6667 2.66667 14.6667H12C12.3536 14.6667 12.6928 14.5262 12.9428 14.2761C13.1929 14.0261 13.3333 13.687 13.3333 13.3333V8.66667M12.3333 1.66667C12.5986 1.40145 12.9582 1.25244 13.3333 1.25244C13.7085 1.25244 14.0681 1.40145 14.3333 1.66667C14.5986 1.93188 14.7476 2.29145 14.7476 2.66667C14.7476 3.04188 14.5986 3.40145 14.3333 3.66667L8 10L5.33333 10.6667L6 8L12.3333 1.66667Z" stroke="#868686" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {showTitleTooltip && (
              <div className="edit-tooltip">
                <div className="tooltip-arrow"></div>
                <div className="tooltip-content">
                  <input
                    type="text"
                    className="tooltip-input"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="Project Title"
                  />
                  <button className="save-btn-small" onClick={handleSaveTitleChanges}>
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="titleBottom">
          <div className="user-info">
            <img src="/assets/avatar-mollie.png" alt="User" className="user-avatar" />
            <div className="user-details">
              <span className="user-name">{workData.userName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="viewwork-page-wrapper">
        <div className="viewwork-content">
          {/* Skills Section */}
          <div className="viewwork-header-bar">
            <div className="viewwork-badges">
              <span className="skill-badge verified">
                UX Design
                <div className="check-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="16" height="16" rx="12" fill="#17B26A" fillOpacity="0.1"/>
                    <path d="M10.6667 6L7 9.66667L5.33333 8" stroke="#17B26A" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </span>
              <span className="skill-badge">+2 More</span>
              <button className="add-skill-btn" onClick={() => setShowSkillTooltip(!showSkillTooltip)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3.33334V12.6667M3.33333 8H12.6667" stroke="#4D4D4D" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Skill
              </button>
            </div>
            
            {showSkillTooltip && (
              <div className="skills-tooltip">
                <div className="tooltip-arrow"></div>
                <div className="tooltip-content-skills">
                  <div className="skills-list">
                    {tempSkills.map((skill, index) => (
                      <span key={index} className="skill-badge-edit">
                        {skill}
                        {index === 0 && (
                          <div className="check-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="16" height="16" rx="12" fill="#17B26A" fillOpacity="0.1"/>
                              <path d="M10.6667 6L7 9.66667L5.33333 8" stroke="#17B26A" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </span>
                    ))}
                  </div>
                  <button className="save-btn-small" onClick={handleSaveSkillChanges}>
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Image */}
          <div className="viewwork-main-image">
            <img src={images[selectedImage]} alt="Portfolio work" className="main-image" />
          </div>

          {/* Image Gallery */}
          <div className="viewwork-image-gallery">
            {images.map((image, index) => (
              <div key={index} className={`gallery-thumbnail ${selectedImage === index ? 'active' : ''}`}>
                <img 
                  src={image} 
                  alt={`Thumbnail ${index + 1}`}
                  className="thumbnail-image"
                  onClick={() => setSelectedImage(index)}
                />
                <button className="delete-btn" onClick={() => handleDeleteImage(index)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H3.33333M3.33333 4H14M3.33333 4V13.3333C3.33333 13.687 3.47381 14.0261 3.72386 14.2761C3.97391 14.5262 4.31305 14.6667 4.66667 14.6667H11.3333C11.687 14.6667 12.0261 14.5262 12.2761 14.2761C12.5262 14.0261 12.6667 13.687 12.6667 13.3333V4H3.33333ZM5.33333 4V2.66667C5.33333 2.31305 5.47381 1.97391 5.72386 1.72386C5.97391 1.47381 6.31305 1.33333 6.66667 1.33333H9.33333C9.68696 1.33333 10.0261 1.47381 10.2761 1.72386C10.5262 1.97391 10.6667 2.31305 10.6667 2.66667V4" stroke="#CA2C17" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="upload-container">
              <label htmlFor="file-upload" className="upload-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="#989898" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Click here to upload images</span>
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="viewwork-description">
            <textarea
              className="description-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Save Changes Button */}
          <div className="save-changes-container">
            <button className="save-changes-btn" onClick={handleSaveChanges}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
