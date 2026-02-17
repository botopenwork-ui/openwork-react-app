import React, { useState, useEffect } from "react";
import "./ConnectWallet.css";
import { useWalletConnection } from "../../functions/useWalletConnection"; // Manages wallet connection logic
import { formatWalletAddress } from "../../functions/formatWalletAddress"; // Utility function to format wallet address

import BackButton from "../../components/BackButton/BackButton";

const contractAddress = "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d";

const WALLETITEMS = [
    {
      icon: 'metamask.svg',
      label: 'Metamask Wallet'  
    },
    {
        icon: 'coinbase.svg',
        label: 'CoinBase Wallet'  
    },
    {
        icon: 'binance.svg',
        label: 'Binance Wallet'  
    },
]

function WalletButton({icon, label, onClick}) {
    return (
      <div onClick={onClick} className="wallet-button">
        <div className="wallet">
            <img src={icon} alt="" />
            <span>{label}</span>
        </div>
        <img src="/arrowRight.svg" alt="" />
      </div>  
    )
}

export default function ConnectWallet() {
    const {walletAddress, connectWallet, disconnectWallet} = useWalletConnection();
    
  return (
    <>
      <div className="form-containerDC form-post">
        <div className="form-header">
          <BackButton to="/" title="Connect Wallet"/>
        </div>
        <div className="form-body">
          <p id="pDC2">
              Select the wallet you would like to connect to
          </p>
          <div className="wallet-list">
              {
                  WALLETITEMS.map((item, index) => (
                      <WalletButton key={index} label={item.label} icon={item.icon} onClick={connectWallet}/>
                  ))
              }
          </div>
        </div>
      </div>
    </>
  );
}
