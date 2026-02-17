import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import JobsTable from "../JobsTable/JobsTable";
import Button from "../Button/Button";
import "./ProfilePackagesTable.css";

export default function ProfilePackagesTable({ 
    packages, 
    currentPage, 
    totalPages, 
    onPageChange,
    packagesPerPage = 4 
}) {
    const navigate = useNavigate();

    const headers = ["Title", "Posted by", "Rating", "Category", "Cost", ""];

    const titleOptions = [
        {
            title: 'Talent View',
            items: [
                'Jobs View', 
                'Skill Oracle View',
                'Talent View',
                'DAO View'
            ]
        },
        {
            title: 'Packages',
            items: [
                'People',
                'Packages'
            ]
        }
    ];

    const filterOptions = [
        {
            title: 'Table Columns',
            items: [
                'Title',
                'Posted by',
                'Rating',
                'Category',
                'Cost'
            ]
        },
        {
            title: 'Filter',
            items: [
                'All',
                'Active',
                'Completed'
            ]
        }
    ];

    const tableData = useMemo(() => {
        return packages.map((pkg) => {
            return [
                <div className="package-title-cell">
                    <img src={pkg.icon} alt="Package Icon" className="packageIcon" />
                    <span>{pkg.title}</span>
                </div>,
                <div className="posted-by-cell">
                    <span>{pkg.postedBy}</span>
                </div>,
                <div className="rating-cell">
                    <span className="rating-value">{pkg.rating}</span>
                    <img src="/star.svg" alt="Star" className="star-icon" />
                </div>,
                <div className="category-cell">
                    {pkg.categories.map((category, index) => (
                        <div key={index} className="category-badge">
                            {category}
                        </div>
                    ))}
                </div>,
                <div className="cost-cell">
                    <span>{pkg.cost}</span>
                    <img src="/xdc.svg" alt="XDC" className="xdc-icon" />
                </div>,
                <div className="details-cell">
                    <Button 
                        label="Details" 
                        icon="/assets/eye-icon.svg" 
                        buttonCss="package-details-button"
                        onClick={() => navigate(`/view-package/${pkg.id}`)}
                    />
                </div>
            ];
        });
    }, [packages, navigate]);

    const indexOfLastPackage = currentPage * packagesPerPage;
    const indexOfFirstPackage = indexOfLastPackage - packagesPerPage;
    const currentPackages = tableData.slice(indexOfFirstPackage, indexOfLastPackage);

    return (
        <div className="profile-packages-table-container">
            <JobsTable
                title={"OpenWork Ledger"}
                tableData={currentPackages}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                headers={headers}
                titleOptions={titleOptions}
                filterOptions={filterOptions}
                applyNow={false}
                backUrl="/profile"
                hideBackButton={true}
                hidePostJob={true}
            />
        </div>
    );
}