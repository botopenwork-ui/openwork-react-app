const { Web3 } = require('web3');
const config = require('../config');

/**
 * Execute receive() on CCTP Transceiver (Arbitrum) for Start Job flow
 * @param {Object} attestationData - Attestation data from Circle API
 * @returns {Promise<{transactionHash: string, alreadyCompleted: boolean}>}
 */
async function executeReceiveOnArbitrum(attestationData) {
  console.log('🔗 Executing receive() on Arbitrum CCTP Transceiver...');
  
  const web3 = new Web3(config.ARBITRUM_SEPOLIA_RPC);
  const privateKey = config.WALL2_PRIVATE_KEY.startsWith('0x') 
    ? config.WALL2_PRIVATE_KEY 
    : `0x${config.WALL2_PRIVATE_KEY}`;
  
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);
  
  const cctpContract = new web3.eth.Contract(
    config.ABIS.CCTP_TRANSCEIVER,
    config.CCTP_TRANSCEIVER_ADDRESS
  );
  
  console.log('📋 Transaction parameters:', {
    contract: config.CCTP_TRANSCEIVER_ADDRESS,
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
async function executeReceiveMessage(attestationData, destinationChain = 'OP Sepolia') {
  console.log(`\n🔗 ========== EXECUTING RECEIVE MESSAGE ==========`);
  console.log(`   Destination Chain: ${destinationChain}`);

  // Select RPC based on chain
  let rpcUrl;
  if (destinationChain === 'OP Sepolia') {
    rpcUrl = config.OP_SEPOLIA_RPC;
  } else if (destinationChain === 'Base Sepolia') {
    rpcUrl = config.BASE_SEPOLIA_RPC;
  } else if (destinationChain === 'Ethereum Sepolia') {
    rpcUrl = config.ETHEREUM_SEPOLIA_RPC;
  } else {
    console.warn(`⚠️ Unknown chain "${destinationChain}", defaulting to OP Sepolia`);
    rpcUrl = config.OP_SEPOLIA_RPC;
  }

  console.log(`   RPC URL: ${rpcUrl ? rpcUrl.substring(0, 50) + '...' : 'NOT CONFIGURED!'}`);

  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for ${destinationChain}. Check .env file.`);
  }

  const web3 = new Web3(rpcUrl);
  const privateKey = config.WALL2_PRIVATE_KEY.startsWith('0x')
    ? config.WALL2_PRIVATE_KEY
    : `0x${config.WALL2_PRIVATE_KEY}`;

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  // CCTP MessageTransmitter address (same across all testnets)
  const transmitterAddress = config.MESSAGE_TRANSMITTER_ADDRESS;

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
