import React from "react";
import { Link } from "react-router-dom";
import "./ProfilePackagesHeader.css";

export default function ProfilePackagesHeader({ 
    profileName, 
    contractId, 
    onCopyContractId,
    backUrl = "/profile" 
}) {
    const formatWalletAddress = (address) => {
        if (!address) return "";
        const start = address.substring(0, 6);
        const end = address.substring(address.length - 4);
        return `${start}....${end}`;
    };

    return (
        <div className="profile-packages-header">
            <div className="profile-header-top">
                <Link className="profile-back-button" to={backUrl}>
                    <img className="profile-back-icon" src="/back.svg" alt="Back Button" />
                </Link>
                <div className="profile-title">{profileName}</div>
            </div>
            <div className="profile-header-bottom">
                <p className="contract-info">
                    Contract ID: {formatWalletAddress(contractId)}
                </p>
                <img
                    src="/copy.svg"
                    className="copy-icon"
                    alt="Copy"
                    onClick={() => onCopyContractId(contractId)}
                />
            </div>
        </div>
    );
}