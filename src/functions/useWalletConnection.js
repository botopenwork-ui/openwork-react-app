// Thin shim — delegates to WalletContext so all components share one wallet state.
// Existing call sites (useWalletConnection()) continue to work unchanged.
import { useWallet } from "../context/WalletContext";

export function useWalletConnection() {
  return useWallet();
}
