// IPFS Gateway utility
// Using Lighthouse gateway for decentralized permanent storage

const IPFS_GATEWAY = 'https://gateway.lighthouse.storage/ipfs';

export function getIPFSUrl(hash) {
  if (!hash) return null;
  // Handle if full URL is passed
  if (hash.startsWith('http')) {
    // Extract hash from existing URL
    const match = hash.match(/ipfs\/([a-zA-Z0-9]+)/);
    if (match) {
      return `${IPFS_GATEWAY}/${match[1]}`;
    }
    return hash;
  }
  return `${IPFS_GATEWAY}/${hash}`;
}

export default { getIPFSUrl };
