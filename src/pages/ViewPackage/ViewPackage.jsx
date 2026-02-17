import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import BlueButton from "../../components/BlueButton/BlueButton";
import "./ViewPackage.css";

export default function ViewPackage() {
    const { packageId } = useParams();
    const navigate = useNavigate();

    // Sample package data - replace with actual API call
    const packageData = {
        id: packageId,
        title: 'UX/UI Package',
        listedBy: {
            username: 'molliehall2504',
            avatar: '/assets/avatar-profile.png',
            profileUrl: '/profile'
        },
        cost: '726.14',
        categories: [
            { name: 'UX Design', verified: true },
            { name: 'UI Design', verified: false },
            { name: 'React', verified: true },
            { name: '+ 5 more', verified: false }
        ],
        description: `I'm a Product Designer based in Melbourne, Australia. I enjoy working on product design, design systems, and Webflow projects, but I don't take myself too seriously.

Here's a list of things I'l provide:
• Basic chat and email support
• Up to 10 individual users
• Basic reporting and analytics`,
        attachments: [
            { name: 'Scope of work.pdf', type: 'pdf' },
            { name: 'Reference 1.png', type: 'image' }
        ]
    };

    const handleBuyNow = () => {
        // Handle buy now action
        console.log('Buy now clicked for package:', packageId);
    };

    return (
        <div className="view-package-container">
            <div className="view-package-card">
                {/* Header */}
                <div className="view-package-header">
                    <BackButton to="/profile-packages" title={packageData.title} />
                </div>

                {/* Body */}
                <div className="view-package-body">
                    {/* Listed By */}
                    <div className="view-package-section">
                        <label className="view-package-label">LISTED BY</label>
                        <div className="view-package-listed-by">
                            <div className="view-package-user-info">
                                <img 
                                    src={packageData.listedBy.avatar} 
                                    alt={packageData.listedBy.username}
                                    className="view-package-avatar"
                                />
                                <span className="view-package-username">
                                    {packageData.listedBy.username}
                                </span>
                            </div>
                            <Link to={packageData.listedBy.profileUrl} className="view-package-view-profile">
                                <span>View Profile</span>
                                <img src="/assets/arrow-up-right-blue.svg" alt="Arrow" />
                            </Link>
                        </div>
                    </div>

                    {/* Cost */}
                    <div className="view-package-section">
                        <label className="view-package-label">COST</label>
                        <div className="view-package-cost">
                            <span>{packageData.cost}</span>
                            <img src="/xdc.svg" alt="XDC" className="xdc-icon" />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="view-package-section">
                        <label className="view-package-label">CATEGORY</label>
                        <div className="view-package-categories">
                            {packageData.categories.map((category, index) => (
                                <div key={index} className="view-package-badge">
                                    <span>{category.name}</span>
                                    {category.verified && (
                                        <div className="view-package-check-icon">
                                            <img src="/assets/check-icon.svg" alt="Verified" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="view-package-section">
                        <label className="view-package-label">DESCRIPTION</label>
                        <p className="view-package-description">
                            {packageData.description}
                        </p>
                    </div>

                    {/* Attachments */}
                    <div className="view-package-section">
                        <label className="view-package-label">ATTACHMENTS</label>
                        <div className="view-package-attachments">
                            {packageData.attachments.map((file, index) => (
                                <div key={index} className="view-package-attachment">
                                    <img src="/assets/insert-drive-file.svg" alt="File" />
                                    <span>{file.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Buy Now Button */}
                <div className="view-package-footer">
                    <BlueButton 
                        label="Buy Now" 
                        onClick={handleBuyNow}
                    />
                </div>
            </div>
        </div>
    );
}
