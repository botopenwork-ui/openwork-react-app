export function formatWalletAddress(address) {
  if (!address) return "";
  const start = address.substring(0, 6);
  const end = address.substring(address.length - 4);
  return `${start}....${end}`;
}
