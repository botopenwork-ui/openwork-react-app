import React from "react";
import './About.css';
import Collapse from "../../components/Collapse/Collapse";

const ABOUTITEMS = [
    {
        icon: '/whitepaper.svg',
        title: 'Read the Whitepaper'
    }
]

const COLLAPSEITEMS = [
    {
        title: 'Decentralized Protocol',
        content: 'OpenWork enables direct, transparent work relationships through non-custodial wallets and smart contracts, eliminating reliance on centralized entities. This takes away 20% commissions, control over data, control over profiles and enables crypto payments for work.'
    },
    {
        title: 'Skill Oracles (Athena)',
        content: 'A mechanism for decentralised dispute resolution, through which nodes on the network qualified to assess jobs of a certain skill can stake their tokens and vote on whether something is true about the job like whether it happened- triggering the smart contract to execute in accordance.'
    },
    {
        title: 'Open Data',
        content: 'All data related to OpenWork is made public on the OpenWork databases, permanently & immutably stored on IPFS with a record on the blockchain. For the first time ever, the internet will have equal access to all job data, including payment, disputes and delivery.'
    },
    {
        title: 'Automated Contracts',
        content: 'Advanced smart contracts allow for conditions like variable payment terms, automating and personalising work agreements.'
    }
]

function AboutItem ({icon, title}) {
    return (
        <div className="about-item">
            <div className="about-item-title">
                <img src={icon} alt="" />
                <span>{title}</span>
            </div>
            <img src="./go.svg" alt="" />
        </div>
    )
}

export default function () {
    return (
        <div className="about-page-wrapper">
            <div className="about-form">
                <div>
                    <img src="/about-logo.svg" alt="" width={176}/>
                </div>
                <div className="about-title">
                    <span>{'Welcome to the future \nof work!'}</span>
                </div>
                <div className="about-content">
                    <span>
                    We're building OpenWork, a decentralized work protocol redefining the way people collaborate on the internet. Free from central authority, OpenWork introduces a new paradigm of work engagement and management.
                    </span>
                </div>
                <div className="about-item-section">
                    {ABOUTITEMS.map((item, index) => (
                        <AboutItem icon={item.icon} title={item.title} key={index}/>
                    ))}
                </div>
                <div className="know-more">Know More</div>
                <div>
                    {
                        COLLAPSEITEMS.map((item, index) => (
                            <>
                                <Collapse title={item.title} content={item.content} key={index}/>
                                {index != COLLAPSEITEMS.length-1 && (<span className="about-item-line"></span>)}
                            </>
                        ))
                    }
                </div>
            </div>
        </div>
    )
}
