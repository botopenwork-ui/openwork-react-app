import React from "react";
import Header from "./header";
import ChainSelector from "../ChainSelector/ChainSelector";
import { useWalletConnection } from "../../functions/useWalletConnection";

export function Layout({ children }) {
    const { walletAddress } = useWalletConnection();
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
            {walletAddress && <ChainSelector walletAddress={walletAddress} />}
            <Header>
            </Header>
            {children}
        </div>
    )
}
