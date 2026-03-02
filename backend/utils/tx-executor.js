const { Web3 } = require('web3');
const config = require('../config');

/**
 * Execute receiveMessage() on ARB MessageTransmitter for Start Job flow (OP → ARB)
 *
 * ⚠️ CRITICAL ROUTING RULE:
 *   OP→ARB: call ARB MessageTransmitter.receiveMessage() DIRECTLY  ← this function
 *   ARB→OP: call OP CCTPTransceiver.receive() selector 0x7376ee1f  ← executeReceiveOnOptimism()
 *
 * Confirmed working: job 30111-93 step 3 tx 0xfc8f9aa3... (ARB MT.receiveMessage)
 *
 * @param {Object} attestationData - Attestation data from Circle API
 * @returns {Promise<{transactionHash: string, alreadyCompleted: boolean}>}
 */
async function executeReceiveOnArbitrum(attestationData) {
  console.log('🔗 Executing receiveMessage() on ARB MessageTransmitter (OP→ARB startJob)...');
  console.log(`   Network Mode: ${config.NETWORK_MODE}`);

  const web3 = new Web3(config.ARBITRUM_RPC);
  const privateKey = config.WALL2_PRIVATE_KEY.startsWith('0x')
    ? config.WALL2_PRIVATE_KEY
    : `0x${config.WALL2_PRIVATE_KEY}`;

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  // ✅ CORRECT: ARB MessageTransmitter (NOT ARB CCTPTransceiver)
  const transmitterAddress = config.MESSAGE_TRANSMITTER_ARB; // 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64
  const transmitterContract = new web3.eth.Contract(config.ABIS.MESSAGE_TRANSMITTER, transmitterAddress);

  // Check service wallet balance before attempting
  const balance = await web3.eth.getBalance(account.address);
  const balanceEth = parseFloat(web3.utils.fromWei(balance, 'ether'));
  console.log(`   Service Wallet: ${account.address} (${balanceEth.toFixed(6)} ETH)`);
  if (balanceEth < 0.0001) {
    throw new Error(`Service wallet balance too low on Arbitrum: ${balanceEth.toFixed(6)} ETH. Top up required.`);
  }

  console.log('📋 Transaction parameters:', {
    contract: transmitterAddress,
    serviceWallet: account.address,
    messageLength: attestationData.message?.length,
    attestationLength: attestationData.attestation?.length
  });

  try {
    // Dynamic gas estimation with 30% buffer
    let gasLimit;
    try {
      const gasEstimate = await transmitterContract.methods.receiveMessage(
        attestationData.message,
        attestationData.attestation
      ).estimateGas({ from: account.address });
      gasLimit = Math.ceil(Number(gasEstimate) * 1.3);
      console.log(`   Gas estimate: ${gasEstimate} → with 30% buffer: ${gasLimit}`);
    } catch (estimateErr) {
      console.warn(`   Gas estimation failed: ${estimateErr.message} — using fallback 300000`);
      gasLimit = 300000;
    }

    const tx = await transmitterContract.methods.receiveMessage(
      attestationData.message,
      attestationData.attestation
    ).send({
      from: account.address,
      gas: gasLimit
    });

    console.log('✅ ARB receiveMessage completed:', {
      txHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed
    });

    return { transactionHash: tx.transactionHash, alreadyCompleted: false };

  } catch (error) {
    console.log('⚠️ ARB receiveMessage failed:', error.message);
    if (error.message.includes('Nonce already used')) {
      console.log('✅ USDC transfer already completed (nonce already used).');
      return { transactionHash: null, alreadyCompleted: true };
    }
    throw new Error(`ARB MessageTransmitter.receiveMessage() failed: ${error.message}`);
  }
}

/**
 * Execute receiveMessage() on MessageTransmitter for Release Payment flow
 * Supports dynamic chain selection based on destination
 * @param {Object} attestationData - Attestation data from Circle API
 * @param {string} destinationChain - Name of the destination chain (e.g. "OP Sepolia")
 * @returns {Promise<{transactionHash: string, alreadyCompleted: boolean}>}
 */
async function executeReceiveMessage(attestationData, destinationChain = 'Optimism') {
  console.log(`\n🔗 ========== EXECUTING RECEIVE MESSAGE ==========`);
  console.log(`   Destination Chain: ${destinationChain}`);
  console.log(`   Network Mode: ${config.NETWORK_MODE}`);

  // Select RPC and MessageTransmitter based on chain (supports both testnet and mainnet names)
  let rpcUrl;
  let transmitterAddress;

  // Normalize chain name for comparison
  const chainLower = destinationChain.toLowerCase();

  if (chainLower.includes('optimism') || chainLower.includes('op')) {
    rpcUrl = config.OPTIMISM_RPC;
    transmitterAddress = config.MESSAGE_TRANSMITTER_OP;
  } else if (chainLower.includes('arbitrum') || chainLower.includes('arb')) {
    rpcUrl = config.ARBITRUM_RPC;
    transmitterAddress = config.MESSAGE_TRANSMITTER_ARB;
  } else if (chainLower.includes('base')) {
    rpcUrl = config.BASE_RPC;
    transmitterAddress = config.MESSAGE_TRANSMITTER_OP; // Base uses same transmitter pattern
  } else if (chainLower.includes('ethereum') || chainLower.includes('eth')) {
    rpcUrl = config.ETHEREUM_RPC;
    transmitterAddress = config.MESSAGE_TRANSMITTER_OP; // Eth uses same transmitter pattern
  } else {
    console.warn(`⚠️ Unknown chain "${destinationChain}", defaulting to Optimism`);
    rpcUrl = config.OPTIMISM_RPC;
    transmitterAddress = config.MESSAGE_TRANSMITTER_OP;
  }

  console.log(`   RPC URL: ${rpcUrl ? rpcUrl.substring(0, 50) + '...' : 'NOT CONFIGURED!'}`);
  console.log(`   MessageTransmitter: ${transmitterAddress || 'NOT CONFIGURED!'}`);

  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for ${destinationChain}. Check .env file.`);
  }

  const web3 = new Web3(rpcUrl);
  const privateKey = config.WALL2_PRIVATE_KEY.startsWith('0x')
    ? config.WALL2_PRIVATE_KEY
    : `0x${config.WALL2_PRIVATE_KEY}`

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  if (!transmitterAddress) {
    throw new Error('MESSAGE_TRANSMITTER_ADDRESS not configured in .env');
  }

  console.log(`   MessageTransmitter: ${transmitterAddress}`);
  console.log(`   Service Wallet: ${account.address}`);

  const transmitterContract = new web3.eth.Contract(config.ABIS.MESSAGE_TRANSMITTER, transmitterAddress);

  // Check service wallet balance
  const balance = await web3.eth.getBalance(account.address);
  const balanceEth = parseFloat(web3.utils.fromWei(balance, 'ether'));
  console.log(`   Service Wallet Balance: ${balanceEth.toFixed(6)} ETH`);
  if (balanceEth < 0.001) {
    throw new Error(`Service wallet balance too low on ${destinationChain}: ${balanceEth.toFixed(6)} ETH. Top up required.`);
  }

  console.log('📋 Transaction parameters:', {
    chain: destinationChain,
    contract: transmitterAddress,
    serviceWallet: account.address,
    messageLength: attestationData.message?.length,
    attestationLength: attestationData.attestation?.length,
    mintRecipient: attestationData.mintRecipient,
    amount: attestationData.amount
  });
  
  try {
    // Dynamic gas estimation with 30% buffer
    let gasLimit;
    try {
      const gasEstimate = await transmitterContract.methods.receiveMessage(
        attestationData.message,
        attestationData.attestation
      ).estimateGas({ from: account.address });
      gasLimit = Math.ceil(Number(gasEstimate) * 1.3);
      console.log(`   Gas estimate: ${gasEstimate} → with 30% buffer: ${gasLimit}`);
    } catch (estimateErr) {
      console.warn(`   Gas estimation failed: ${estimateErr.message} — using fallback 300000`);
      gasLimit = 300000;
    }

    const tx = await transmitterContract.methods.receiveMessage(
      attestationData.message,
      attestationData.attestation
    ).send({
      from: account.address,
      gas: gasLimit
    });
    
    console.log(`✅ ReceiveMessage transaction completed on ${destinationChain}:`, {
      txHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed
    });
    
    return {
      transactionHash: tx.transactionHash,
      alreadyCompleted: false
    };
    
  } catch (error) {
    console.log(`\n❌ ========== RECEIVE MESSAGE FAILED ==========`);
    console.log(`   Chain: ${destinationChain}`);
    console.log(`   Error: ${error.message}`);

    // Log more error details if available
    if (error.data) {
      console.log(`   Error Data: ${JSON.stringify(error.data)}`);
    }
    if (error.code) {
      console.log(`   Error Code: ${error.code}`);
    }

    // Only treat "Nonce already used" as already completed — that specifically means
    // the CCTP message was already relayed. Other reverts are real failures.
    if (error.message.includes('Nonce already used')) {
      console.log('✅ Payment was already completed by CCTP (nonce already used). Applicant has received USDC.');
      return {
        transactionHash: null,
        alreadyCompleted: true
      };
    }

    // All other errors are real failures
    console.log('================================================\n');
    throw new Error(`${destinationChain} receiveMessage() failed: ${error.message}`);
  }
}

module.exports = {
  executeReceiveOnArbitrum,
  executeReceiveMessage,
  // Keep for backward compatibility
  executeReceiveMessageOnOpSepolia: (attestation) => executeReceiveMessage(attestation, 'OP Sepolia'),
  // Correct OP mainnet receive — must use CCTPTransceiver.receive(), NOT MessageTransmitter.receiveMessage()
  // Direct MT call fails with "Invalid signature: not attester" on OP mainnet (attester set mismatch)
  executeReceiveOnOptimism: async function(attestationData) {
    console.log('\n🔗 ========== EXECUTING RECEIVE ON OPTIMISM (CCTPTransceiver) ==========');
    console.log(`   Network Mode: ${config.NETWORK_MODE}`);
    const web3 = new Web3(config.OPTIMISM_RPC);
    const privateKey = config.WALL2_PRIVATE_KEY.startsWith('0x')
      ? config.WALL2_PRIVATE_KEY
      : `0x${config.WALL2_PRIVATE_KEY}`;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);

    const balance = await web3.eth.getBalance(account.address);
    const balanceEth = parseFloat(web3.utils.fromWei(balance, 'ether'));
    console.log(`   Service Wallet: ${account.address} (${balanceEth.toFixed(6)} ETH)`);
    if (balanceEth < 0.0005) {
      throw new Error(`Service wallet ETH too low on Optimism: ${balanceEth.toFixed(6)} ETH`);
    }

    // ⚠️ CRITICAL: Must call CCTPTransceiver.receive(), NOT MessageTransmitter.receiveMessage()
    // Direct MT call fails with "Invalid signature: not attester" on OP mainnet
    // Selector: keccak256("receive(bytes,bytes)") = 0x7376ee1f
    const cctpTransceiverAddress = config.CCTP_OP_ADDRESS; // 0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15
    const selector = '0x7376ee1f';
    const encodedArgs = web3.eth.abi.encodeParameters(
      ['bytes', 'bytes'],
      [attestationData.message, attestationData.attestation]
    );
    const calldata = selector + encodedArgs.slice(2);

    console.log(`   CCTPTransceiver: ${cctpTransceiverAddress}`);
    console.log(`   selector: ${selector} (receive(bytes,bytes))`);

    try {
      // Static call first
      await web3.eth.call({ to: cctpTransceiverAddress, from: account.address, data: calldata });
      console.log('   Static call: ✅ would succeed');
    } catch (staticErr) {
      if (staticErr.message.includes('Nonce already used')) {
        console.log('✅ Already completed (nonce already used)');
        return { transactionHash: null, alreadyCompleted: true };
      }
      throw new Error(`CCTPTransceiver.receive() static call failed: ${staticErr.message}`);
    }

    try {
      const gasEstimate = await web3.eth.estimateGas({ to: cctpTransceiverAddress, from: account.address, data: calldata });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.3);
      console.log(`   Gas: ${gasEstimate} → ${gasLimit} (with 30% buffer)`);

      const nonce = await web3.eth.getTransactionCount(account.address, 'latest');
      const gasPrice = await web3.eth.getGasPrice();
      const signedTx = await web3.eth.accounts.signTransaction({
        to: cctpTransceiverAddress, data: calldata, gas: gasLimit,
        gasPrice, nonce
      }, privateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(`✅ OP CCTPTransceiver.receive() completed:`, {
        txHash: receipt.transactionHash, gasUsed: receipt.gasUsed
      });
      return { transactionHash: receipt.transactionHash, alreadyCompleted: false };
    } catch (error) {
      if (error.message.includes('Nonce already used')) {
        console.log('✅ Already completed (nonce already used)');
        return { transactionHash: null, alreadyCompleted: true };
      }
      throw new Error(`OP CCTPTransceiver.receive() failed: ${error.message}`);
    }
  }
};
