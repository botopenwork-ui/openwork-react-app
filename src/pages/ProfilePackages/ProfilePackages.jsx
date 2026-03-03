import React, { useState } from "react";
import ProfilePackagesHeader from "../../components/ProfilePackagesHeader/ProfilePackagesHeader";
import ProfilePackagesTable from "../../components/ProfilePackagesTable/ProfilePackagesTable";
import "./ProfilePackages.css";
import { useWalletConnection } from "../../functions/useWalletConnection";

export default function ProfilePackages() {
    const { walletAddress } = useWalletConnection();

    function formatWalletAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}....${address.substring(address.length - 4)}`;
    }
    const [currentPage, setCurrentPage] = useState(1);
    const packagesPerPage = 4; // Number of packages per page
    
    const handleCopyToClipboard = (address) => {
        navigator.clipboard
            .writeText(address)
            .then(() => {
                void 0 /* clipboard copy acknowledged */;
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    };

    const packages = [
        {
            id: 0,
            title: 'Branding Package',
            postedBy: '',
            rating: 4.9,
            categories: ['UX Design', '+5'],
            cost: '7624.14',
            icon: '/browseJobs.svg'
        },
        {
            id: 1,
            title: 'React WebApp Deve...',
            postedBy: '',
            rating: 3.2,
            categories: ['Webflow', '+2'],
            cost: '24.14',
            icon: '/doc.svg'
        },
        {
            id: 2,
            title: 'UI Design Package',
            postedBy: '',
            rating: 4.9,
            categories: ['UX Design', '+6'],
            cost: '762',
            icon: '/browseJobs.svg'
        },
        {
            id: 3,
            title: 'UI for OpenWork',
            postedBy: '',
            rating: 4.9,
            categories: ['UX Design', '+5'],
            cost: '7624.14',
            icon: '/doc.svg'
        },
    ];

    const totalPages = Math.ceil(packages.length / packagesPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    React.useEffect(() => {
        document.body.classList.add('profile-packages-page');
        return () => {
            document.body.classList.remove('profile-packages-page');
        };
    }, []);

    return (
        <div className="profile-packages-main-container">
            <ProfilePackagesHeader
                profileName={formatWalletAddress(walletAddress) || "—"}
                contractId={walletAddress || ""}
                onCopyContractId={handleCopyToClipboard}
                backUrl="/profile"
            />
            
            <ProfilePackagesTable
                packages={packages}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={paginate}
                packagesPerPage={packagesPerPage}
            />
        </div>
    );
}
