import React from "react";
import { useWalletConnection } from "../../functions/useWalletConnection";
import ProfilePortfolio from "../ProfilePortfolio/ProfilePortfolio";
import ProfilePortfolioOwner from "../ProfilePortfolioOwner/ProfilePortfolioOwner";

/**
 * Wrapper component that conditionally renders portfolio view based on ownership
 * If viewing your own profile -> shows ProfilePortfolioOwner (with edit/delete buttons)
 * If viewing someone else's profile -> shows ProfilePortfolio (view-only)
 */
export default function ProfilePortfolioWrapper() {
  const { walletAddress } = useWalletConnection();
  
  // For now, since we're always viewing our own portfolio from /profile-portfolio
  // we'll show the owner version when wallet is connected
  // In the future, this can be extended to check against a URL parameter
  const isOwner = !!walletAddress;
  
  return isOwner ? <ProfilePortfolioOwner /> : <ProfilePortfolio />;
}
