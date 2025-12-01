import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./JobsTable.css";
import DropDown from "../DropDown/DropDown";
import SearchInput from "../SearchInput/SearchInput";
import BlueButton from "../BlueButton/BlueButton";
import FilterOption from "../FilterOption/FilterOption";
import DetailButton from "../DetailButton/DetailButton";
import Button from "../Button/Button";

const BOXITEMS = [
    {
        icon : '/proposals.svg',
        title : 'SKILL ORACLE PROPOSALS',
        number: '12'
    },
    {
        icon : '/members.svg',
        title : 'TOTAL MEMBERS',
        number: '120'
    },
    {
        icon : '/stakings.svg',
        title : 'MY CURRENT STAKINGS',
        number: '120,000'
    }
]

function Box({icon, title, number, showJoinButton, onJoinClick}) {
    const navigate = useNavigate();
    
    return(
        <div className="box-component">
            <div className="box-title">
                <img src={icon} alt="" />
                <span>{title}</span>
            </div>
            <div className="box-content">
                <span>{number}</span>
                {showJoinButton && number === '0' ? (
                    <BlueButton label="Join DAO" onClick={() => navigate('/join-dao')} />
                ) : (
                    <DetailButton to={`/`} imgSrc="/view.svg" alt="detail" />
                )}
            </div>
        </div>
    )
}

export default function JobsTable({ title, tableData, currentPage, totalPages, onPageChange, headers, titleOptions, filterOptions, applyNow, addMember, backUrl='/work', boxSection, customBoxItems, customButtonLabel, customButtonIcon, onCustomButtonClick, ledgerTitle, onReferEarnClick, hideBackButton, hidePostJob, selectedColumns, onColumnToggle, allColumns, selectedFilter, onFilterChange }) {
    const truncateAddress = (address) => {
        if (!address) return "";
        const start = address.substring(0, 6);
        const end = address.substring(address.length - 4, address.length);
        return `${start}...${end}`;
    };

    return (
        <>
            { boxSection && <>
                <div className="title-section back-section">
                    <div className="back">
                        <Link to={backUrl} className="backButton">
                            <img src="/back.svg" alt="Back" className="backIconV" />
                        </Link>
                        <div className="tableTitleV">{title}</div>
                    </div>
                    <Button label={'Refer & Earn'} icon='/refer_earn.svg' buttonCss={'refer-earn'} onClick={onReferEarnClick}/>
                </div>
                <div className="box-section">
                    {
                        (customBoxItems || BOXITEMS).map((item, index) => (
                            <Box 
                                key={index} 
                                icon={item.icon} 
                                title={item.title} 
                                number={item.number}
                                showJoinButton={customBoxItems ? true : false}
                                onJoinClick={() => console.log('Join DAO clicked')}
                            />
                        ))
                    }
                </div>
            </>}
            <div className="title-section">
                <div className="back">
                    { !boxSection && !hideBackButton && <Link to={backUrl} className="backButton">
                        <img src="/back.svg" alt="Back" className="backIconV" />
                    </Link>}
                    <div className="tableTitleV">{ledgerTitle || title}</div>
                </div>
                <div className="title-option">
                    {
                        titleOptions.map((options, index) => (
                            <DropDown label={options.title} options={options.items} />
                            // <FilterOption label={'Table Columns'} />
                        ))
                    }
                </div>
            </div>
            <div className="table-section">
                <div className="filter-section">
                    <SearchInput />
                    <div className="title-option">
                    {
                        filterOptions.map((options, index) => {
                            const isColumnSelector = options.title === "Table Columns";
                            const isFilter = options.title === "Filter";
                            return (
                                <FilterOption 
                                    key={index}
                                    label={options.title} 
                                    options={options.items}
                                    isColumnSelector={isColumnSelector}
                                    selectedColumns={isColumnSelector ? selectedColumns : undefined}
                                    onColumnToggle={isColumnSelector ? onColumnToggle : undefined}
                                    allColumns={isColumnSelector ? allColumns : undefined}
                                    selectedFilter={isFilter ? selectedFilter : undefined}
                                    onFilterChange={isFilter ? onFilterChange : undefined}
                                />
                            );
                        })
                    }
                    {customButtonLabel ? 
                     <BlueButton label={customButtonLabel} icon={customButtonIcon} onClick={onCustomButtonClick || (() => {})} />
                    : applyNow?
                     <BlueButton label="Apply Now" onClick={() => {
                        location.pathname = '/apply-now'
                    }}/>
                    :
                     !addMember && !hidePostJob && <BlueButton label="Post a Job" icon={'/plus.svg'} onClick={() => {
                        location.pathname = '/post-job'
                    }}/>}
                    {addMember && !customButtonLabel && <BlueButton label="Add Member" icon={'/plus.svg'} onClick={() => {
                        location.pathname = '/add-member'
                    }}/>}
                    </div>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index}>{header}
                                {index == 0?<img src="/arrowdown.svg" alt="" />:''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((job) => (
                            <tr key={job.jobId}>
                                {job.map((item, i) => (
                                    <td>{item}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pagination">
                    {currentPage > 1 && (
                        <button onClick={() => onPageChange(currentPage - 1)} className="page-link">
                            <img src="/back.svg" alt="Back" className="pagination-icon" />
                        </button>
                    )}
                    <div className="page-text">
                        <span style={{ color: "#868686" }}>
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>
                    {currentPage < totalPages && (
                        <button onClick={() => onPageChange(currentPage + 1)} className="page-link">
                            <img src="/front.svg" alt="Forward" className="pagination-icon" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
