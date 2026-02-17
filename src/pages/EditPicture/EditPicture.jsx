import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EditPicture.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import BackButtonProposal from "../../components/BackButtonProposal/BackButtonProposal";
import BlueButton from "../../components/BlueButton/BlueButton";
import Button from "../../components/Button/Button";

export default function EditPicture() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "molliehall2504",
        firstName: "Mollie",
        lastName: "Hall",
        location: "Melbourne, Australia",
        languages: "English, Hindi",
        experience: "4 Years",
        hourlyRate: "76",
        bio: "I'm a Product Designer based in Melbourne, Australia. I enjoy working on product design, design systems, and Webflow projects, but I don't take myself too seriously."
    });

    const SKILLITEMS = [
        {
            title: 'UX Design',
            verified: true
        },
        {
            title: 'Product Design',
            verified: false
        },
        {
            title: 'Webflow',
            verified: false
        },
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveChanges = () => {
        console.log("Saving changes:", formData);
        navigate('/profile-about');
    };

    const handleEditPicture = () => {
        console.log("Edit picture clicked");
    };

    return (
        <>
            <div className="newTitle">
                <div className="titleTop">
                    <div className="goBack" onClick={() => navigate('/profile-about')}>
                        <img className="goBackImage" src="/back.svg" alt="Back Button" />
                    </div>  
                    <div className="titleText">{formData.username}</div>
                </div>
                <div className="titleBottom">
                    <p>Contract ID: 0xDEAF...fB8B</p>
                    <img 
                        src="/copy.svg" 
                        className="copyImage" 
                        onClick={() => handleCopyToClipboard("0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}
                    />
                </div>
            </div>
            <div className="edit-picture-page-container">

            {/* Main Card */}
            <div className="edit-picture-card">
                <div className="edit-picture-card-section">
                    <h3 className="edit-picture-card-title">About</h3>
                </div>

                <div className="edit-picture-scrollable-content">
                    {/* Avatar and Edit Picture Button */}
                    <div className="edit-picture-avatar-section">
                        <div className="edit-picture-avatar">
                            <img src="/assets/avatar-profile.png" alt="Profile" />
                        </div>
                        <Button 
                            label="Edit picture" 
                            onClick={handleEditPicture}
                            icon="/edit.svg"
                            buttonCss="edit-picture-custom-btn"
                        />
                    </div>

                    {/* Username Input */}
                    <div className="edit-picture-input-group">
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            className="edit-picture-input"
                        />
                    </div>

                    {/* First Name and Last Name */}
                    <div className="edit-picture-name-row">
                        <div className="edit-picture-input-group">
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="edit-picture-input"
                            />
                        </div>
                        <div className="edit-picture-input-group">
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="edit-picture-input"
                            />
                        </div>
                    </div>

                    {/* Skills Section */}
                    <div className="edit-picture-skills-section">
                        <div className="edit-picture-skills">
                            {SKILLITEMS.map((item, index) => (
                                <SkillBox key={index} title={item.title} verified={item.verified} />
                            ))}
                        </div>
                    </div>

                    {/* Location Input */}
                    <div className="edit-picture-input-group">
                        <div className="edit-picture-input-with-icon">
                            <img src="/assets/au-flag.svg" alt="AU" className="input-icon-left" />
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="edit-picture-input with-icon"
                            />
                            <img src="/assets/chevron-down.svg" alt="Dropdown" className="input-icon-right chevron-down" />
                        </div>
                    </div>

                    {/* Languages Input */}
                    <div className="edit-picture-input-group">
                        <input
                            type="text"
                            name="languages"
                            value={formData.languages}
                            onChange={handleInputChange}
                            className="edit-picture-input"
                        />
                    </div>

                    {/* Experience Input */}
                    <div className="edit-picture-input-group">
                        <div className="edit-picture-input-with-icon no-left-icon">
                            <input
                                type="text"
                                name="experience"
                                value={formData.experience}
                                onChange={handleInputChange}
                                className="edit-picture-input"
                            />
                            <img src="/assets/chevron-down.svg" alt="Dropdown" className="input-icon-right chevron-down" />
                        </div>
                    </div>

                    {/* Hourly Rate Input */}
                    <div className="edit-picture-input-group">
                        <div className="edit-picture-input-with-icon no-left-icon">
                            <input
                                type="text"
                                name="hourlyRate"
                                value={formData.hourlyRate}
                                onChange={handleInputChange}
                                className="edit-picture-input"
                            />
                            <div className="input-icon-right-group">
                                <span>/ Hr</span>
                                <img src="/assets/usdc-icon.png" alt="USDC" />
                            </div>
                        </div>
                    </div>

                    {/* Bio Textarea */}
                    <div className="edit-picture-input-group">
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            className="edit-picture-textarea"
                            rows="4"
                        />
                    </div>
                </div>

                {/* Action Buttons - Outside scrollable area */}
                <div className="edit-picture-actions">
                    <Button 
                        label="Get Skills Verified" 
                        onClick={() => navigate('/skill-verification-page')}
                        buttonCss="edit-picture-skills-btn"
                    />
                    <BlueButton 
                        label="Save Changes" 
                        onClick={handleSaveChanges}
                    />
                </div>
            </div>
            </div>
        </>
    );
}
