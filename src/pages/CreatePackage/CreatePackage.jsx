import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./CreatePackage.css";

const CreatePackage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    cost: "",
    title: "",
    description: "",
    categories: [],
    linkedProject: ""
  });

  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const availableCategories = [
    { name: "UX Design", verified: true },
    { name: "Product Design", verified: false },
    { name: "Webflow", verified: false }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => {
      const exists = prev.categories.find(c => c.name === category.name);
      if (exists) {
        return {
          ...prev,
          categories: prev.categories.filter(c => c.name !== category.name)
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, category]
        };
      }
    });
  };

  const handleSubmit = () => {
    console.log("Package data:", formData);
    // Handle package creation
    navigate("/profile-packages");
  };

  return (
    <div className="create-package-container">
      <div className="create-package-card">
        <div className="create-package-header">
          <BackButton to="/profile-packages" title="Create a Package" />
        </div>

        <div className="create-package-body">
          {/* Cost Input */}
          <div className="create-package-section">
            <div className="create-package-input-wrapper">
              <input
                type="text"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                placeholder="820"
                className="create-package-input"
              />
              <div className="create-package-currency">
                <img src="/assets/usdc-icon.png" alt="USDC" />
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div className="create-package-section">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Package Title"
              className="create-package-input"
            />
          </div>

          {/* Description Input */}
          <div className="create-package-section">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Here's a list of things I'll provide:
• Basic chat and email support
• Up to 10 individual users
• Basic reporting and analytics"
              className="create-package-textarea"
              rows="5"
            />
          </div>

          {/* Categories Selection */}
          <div className="create-package-section">
            <div className="create-package-categories-container">
              <div className="create-package-categories">
                {formData.categories.map((category, index) => (
                  <div
                    key={index}
                    className="create-package-badge"
                    onClick={() => handleCategoryToggle(category)}
                  >
                    <span className="create-package-badge-text">{category.name}</span>
                    {category.verified && (
                      <div className="create-package-check-icon">
                        <img src="/assets/check-icon.svg" alt="Verified" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Available categories not yet selected */}
                {availableCategories
                  .filter(cat => !formData.categories.find(c => c.name === cat.name))
                  .map((category, index) => (
                    <div
                      key={index}
                      className="create-package-badge create-package-badge-unselected"
                      onClick={() => handleCategoryToggle(category)}
                    >
                      <span className="create-package-badge-text">{category.name}</span>
                      {category.verified && (
                        <div className="create-package-check-icon">
                          <img src="/assets/check-icon.svg" alt="Verified" />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Link to Portfolio Project */}
          <div className="create-package-section">
            <button className="create-package-link-button">
              <span className="create-package-link-text">Link to an existing portfolio project</span>
              <img src="/assets/chevron-down.svg" alt="" className="create-package-chevron" />
            </button>
          </div>
        </div>

        <div className="create-package-footer">
          <button onClick={handleSubmit}>Create Package</button>
        </div>
      </div>
    </div>
  );
};

export default CreatePackage;
