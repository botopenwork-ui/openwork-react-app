export const cctpTransceiverETH = {
  id: 'cctpTransceiverETH',
  name: 'CCTP Transceiver',
  chain: 'eth',
  column: 'eth-main',
  order: 3,
  status: 'testnet',
  version: 'v2.0.0',
  gas: '89K',
  mainnetNetwork: 'Ethereum Mainnet',
  testnetNetwork: 'Ethereum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x6DB4326E2CD04481A7F558B40eb223E13c6C6e98',
  tvl: 'N/A',
  docs: 'Circle CCTP V2 Transceiver on Ethereum Sepolia - Enables native USDC cross-chain transfers using Circle\'s Cross-Chain Transfer Protocol. Same implementation as OP transceiver, only Circle contract addresses differ.',
  
  deployConfig: {
    type: 'standard',
    constructor: [
      {
        name: '_tokenMessenger',
        type: 'address',
        description: 'Circle TokenMessenger contract address on Ethereum Sepolia',
        placeholder: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
      },
      {
        name: '_messageTransmitter',
        type: 'address',
        description: 'Circle MessageTransmitter contract address on Ethereum Sepolia',
        placeholder: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD'
      },
      {
        name: '_usdc',
        type: 'address',
        description: 'Circle USDC token address on Ethereum Sepolia',
        placeholder: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
      }
    ],
    networks: {
      testnet: {
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR-PROJECT-ID',
        explorer: 'https://sepolia.etherscan.io',
        currency: 'ETH'
      },
      mainnet: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth.llamarpc.com',
        explorer: 'https://etherscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '1.2M',
    postDeploy: {
      message: 'Standard deployment complete! CCTP Transceiver ready for USDC transfers.',
      nextSteps: [
        '1. Deploy CCTPv2Transceiver with Circle contract addresses',
        '2. Configure LOWJC: LOWJC.setCCTPSender(cctpTransceiverAddress)',
        '3. Configure Athena Client: AthenaClient.setCCTPSender(cctpTransceiverAddress)',
        '4. Test USDC transfer to Arbitrum (Domain 3)',
        '5. Setup backend to poll Circle API and relay attestations',
        '6. Verify contract on Ethereum Sepolia Etherscan',
        '7. IMPORTANT: Identical to OP transceiver, only Circle addresses differ'
      ]
    }
  },
  
  code: `// Same implementation as Arbitrum and OP transceivers
// See: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/cctp-v2-ft-transceiver.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CCTPv2Transceiver {
    ITokenMessengerV2 public immutable tokenMessenger;
    IMessageTransmitterV2 public immutable messageTransmitter;
    IERC20 public immutable usdc;

    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdc
    ) {
        tokenMessenger = ITokenMessengerV2(_tokenMessenger);
        messageTransmitter = IMessageTransmitterV2(_messageTransmitter);
        usdc = IERC20(_usdc);
    }

    function sendFast(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint256 maxFee
    ) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        usdc.approve(address(tokenMessenger), amount);
        
        tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc),
            bytes32(0),
            maxFee,
            1000
        );
        
        emit FastTransferSent(amount, destinationDomain, mintRecipient, maxFee);
    }

    function receive(bytes calldata message, bytes calldata attestation) external {
        messageTransmitter.receiveMessage(message, attestation);
        emit FastTransferReceived(message, attestation);
    }

    function addressToBytes32(address addr) external pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}`
};
