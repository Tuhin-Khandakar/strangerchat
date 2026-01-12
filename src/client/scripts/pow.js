/**
 * Solves a Proof of Work challenge
 * @param {string} prefix - The random prefix provided by server
 * @param {number} complexity - Number of trailing zero hex characters required (e.g. 3)
 * @returns {Promise<string>} - The nonce that satisfies the condition
 */
export async function solvePoW(prefix, complexity) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Crypto API not available');
  }

  const target = '0'.repeat(complexity);
  let nonce = 0;
  const encoder = new TextEncoder();

  const startTime = Date.now();
  const TIMEOUT_MS = 30000; // 30 seconds

  while (true) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error('PoW calculation timed out');
    }

    const text = prefix + nonce;
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Optimization: Check last bytes first to avoid full hex conversion
    // But for simplicity and correctness with "hex string endsWith", we convert.
    // To optimize: only convert needed bytes.
    // 3 hex chars = 1.5 bytes.
    // Let's just convert the whole thing, it's fast enough for small complexity.
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    if (hashHex.endsWith(target)) {
      return nonce.toString();
    }
    nonce++;

    // Yield to main thread every 2000 iterations to keep UI responsive
    if (nonce % 2000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}
