const { Web3 } = require('web3');
const config = require('../config');

/**
 * Execute receive() on CCTP Transceiver (Arbitrum) for Start Job flow
 * @param {Object} attestationData - Attestation data from Circle API
 * @returns {Promise<{transactionHash: string, alreadyCompleted: boolean}>}
 */
async function executeReceiveOnArbitrum(attestationData) {
  console.log('🔗 Executing receive() on Arbitrum CCTP Transceiver...');
  console.log(`   Network Mode: ${config.NETWORK_MODE}`);

  // Use dynamic RPC based on network mode
  const web3 = new Web3(config.ARBITRUM_RPC);
  const privateKey = config.WALL2_PRIVATE_KEY.startsWith('0x')
    ? config.WALL2_PRIVATE_KEY
    : `0x${config.WALL2_PRIVATE_KEY}`;

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  // Use dynamic CCTP address based on network mode
  const cctpAddress = config.CCTP_ARB_ADDRESS;

  const cctpContract = new web3.eth.Contract(
    config.ABIS.CCTP_TRANSCEIVER,
    cctpAddress
  );

  console.log('📋 Transaction parameters:', {
    contract: cctpAddress,
    serviceWallet: account.address,
    messageLength: attestationData.message?.length,
    attestationLength: attestationData.attestation?.length
  });
  
  try {
    const tx = await cctpContract.methods.receive(
      attestationData.message,
      attestationData.attestation
    ).send({
      from: account.address,
      gas: 300000
    });
    
    console.log('✅ Receive transaction completed:', {
      txHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed
    });
    
    return {
      transactionHash: tx.transactionHash,
      alreadyCompleted: false
    };
    
  } catch (error) {
    console.log('⚠️ Receive execution failed:', error.message);
    
    // Check if already completed (this is actually success)
    if (error.message.includes('reverted') || error.message.includes('revert')) {
      console.log('✅ USDC transfer was already completed by CCTP!');
      console.log('ℹ️ NOWJC contract on Arbitrum already received funds.');
      
      return {
        transactionHash: null,
        alreadyCompleted: true
      };
    }
    
    // For other errors, throw
    throw new Error(`Arbitrum receive() failed: ${error.message}`);
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

  // Check service wallet balance
  const balance = await web3.eth.getBalance(account.address);
  console.log(`   Service Wallet Balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

  if (BigInt(balance) < BigInt(web3.utils.toWei('0.001', 'ether'))) {
    console.warn(`⚠️ WARNING: Service wallet has low balance on ${destinationChain}!`);
  }

  const transmitterContract = new web3.eth.Contract(
    config.ABIS.MESSAGE_TRANSMITTER,
    transmitterAddress
  );

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
    const tx = await transmitterContract.methods.receiveMessage(
      attestationData.message,
      attestationData.attestation
    ).send({
      from: account.address,
      gas: 300000
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

    // Check if already completed (nonce already used - this is actually success)
    if (error.message.includes('reverted') || error.message.includes('revert') || error.message.includes('Nonce already used')) {
      console.log('✅ Payment was already completed by CCTP! Applicant has received USDC.');
      console.log('ℹ️ The NOWJC contract successfully transferred USDC via CCTP.');

      return {
        transactionHash: null,
        alreadyCompleted: true
      };
    }

    // For other errors, throw with full details
    console.log('================================================\n');
    throw new Error(`${destinationChain} receiveMessage() failed: ${error.message}`);
  }
}

module.exports = {
  executeReceiveOnArbitrum,
  executeReceiveMessage,
  // Keep for backward compatibility
  executeReceiveMessageOnOpSepolia: (attestation) => executeReceiveMessage(attestation, 'OP Sepolia')
};
