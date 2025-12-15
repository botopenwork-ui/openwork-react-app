import React from "react";
import Header from "./header";
import ChainSelector from "../ChainSelector/ChainSelector";
import { useWalletConnection } from "../../functions/useWalletConnection";

export function Layout({ children }) {
    const { walletAddress } = useWalletConnection();
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
            {walletAddress && walletAddress.length > 0 && (
                <ChainSelector key={walletAddress} walletAddress={walletAddress} />
            )}
            <Header>
            </Header>
            {children}
        </div>
    )
}
