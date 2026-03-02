// IPFS utility — reads proxied through backend to avoid CORS noise and multi-gateway spam

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Get a proxied IPFS content URL (goes through our backend → local node).
 */
export function getIPFSUrl(hash) {
  if (!hash) return null;
  const clean = extractHash(hash);
  if (!clean) return null;
  return `${BACKEND_URL}/api/ipfs/content/${clean}`;
}

/**
 * Fetch IPFS content as JSON with timeout and graceful fallback.
 * Returns null on failure — never throws.
 */
export async function fetchIPFSJson(hash, timeoutMs = 8000) {
  if (!hash) return null;
  const clean = extractHash(hash);
  if (!clean) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${BACKEND_URL}/api/ipfs/content/${clean}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractHash(hash) {
  if (!hash) return null;
  if (hash.startsWith('http')) {
    const m = hash.match(/ipfs\/([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  }
  if (hash.startsWith('ipfs://')) return hash.slice(7);
  // Reject clearly fake hashes
  if (hash.startsWith('Qm') && hash.length < 20) return null;
  if (hash.includes('smoke') || hash.includes('test') || hash.includes('heartbeat')) return null;
  return hash;
}

export default { getIPFSUrl, fetchIPFSJson };
