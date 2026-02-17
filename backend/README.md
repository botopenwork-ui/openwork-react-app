# OpenWork CCTP Backend Server

Automated backend service for completing CCTP (Circle Cross-Chain Transfer Protocol) transfers in OpenWork's cross-chain job and payment flows.

## 🎯 Purpose

This backend server ensures CCTP transfers complete automatically 24/7, eliminating the need for users to keep their browser open. It monitors blockchain events and automatically executes the final step of CCTP transfers.

## 🔄 Automated Flows

### 1. Start Job Flow (OP Sepolia → Arbitrum)
```
User starts job on OP Sepolia LOWJC
  ↓
Backend detects JobStarted event on NOWJC (Arbitrum)
  ↓
Polls Circle API for CCTP attestation (Domain 2)
  ↓
Executes receive() on Arbitrum CCTP Transceiver
  ↓
✅ USDC minted to NOWJC contract
```

### 2. Release Payment Flow (Arbitrum → OP Sepolia)
```
User releases payment (triggers NOWJC on Arbitrum)
  ↓
Backend detects PaymentReleased event on NOWJC
  ↓
Polls Circle API for CCTP attestation (Domain 3)
  ↓
Executes receiveMessage() on OP Sepolia MessageTransmitter
  ↓
✅ USDC minted to applicant wallet
```

## 📦 Installation

```bash
cd backend
npm install
```

## ⚙️ Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure:

```env
# RPC URLs (required)
OP_SEPOLIA_RPC_URL=https://optimism-sepolia.infura.io/v3/YOUR_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arbitrum-sepolia.infura.io/v3/YOUR_KEY

# Service Wallet Private Key (required) - WITHOUT 0x prefix
WALL2_PRIVATE_KEY=your_private_key_here

# Contract addresses are pre-configured but can be overridden
# LOWJC_CONTRACT_ADDRESS=0x896a3Bc6ED01f549Fe20bD1F25067951913b793C
# NOWJC_CONTRACT_ADDRESS=0x9E39B37275854449782F1a2a4524405cE79d6C1e
# CCTP_TRANSCEIVER_ADDRESS=0xB64f20A20F55D77bbe708Db107AA5E53a9e39063
# MESSAGE_TRANSMITTER_ADDRESS=0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275
```

### Important Notes:
- **Service Wallet (WALL2)**: Must have ETH on both OP Sepolia and Arbitrum Sepolia for gas fees
- **RPC URLs**: Use reliable providers (Infura, Alchemy, etc.) with high rate limits
- **Private Key**: NEVER commit your `.env` file to git

## 🚀 Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will:
- Start listening for blockchain events on port 3001
- Monitor NOWJC contract for JobStarted and PaymentReleased events
- Process CCTP transfers automatically in the background

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Returns:
```json
{
  "status": "running",
  "uptime": 3600,
  "processingJobs": 2,
  "completedJobs": 15,
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

### Stats
```bash
curl http://localhost:3001/stats
```

Returns current processing jobs and recent completions.

## 🖥️ Deployment Options

### Option 1: VPS (DigitalOcean, Linode, etc.)

1. **Setup server:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
nano .env  # Edit with your values
```

3. **Run with PM2 (recommended):**
```bash
npm install -g pm2
pm2 start server.js --name openwork-cctp
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

4. **Monitor:**
```bash
pm2 logs openwork-cctp
pm2 status
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "server.js"]
```

```bash
docker build -t openwork-cctp .
docker run -d \
  --name openwork-cctp \
  --env-file .env \
  -p 3001:3001 \
  --restart unless-stopped \
  openwork-cctp
```

### Option 3: Cloud Platforms (AWS, GCP, Azure)

Deploy as a container or Node.js application. Minimum requirements:
- **CPU**: 1 vCPU
- **RAM**: 512 MB
- **Storage**: 10 GB
- **Network**: Stable internet connection

## 🔍 Troubleshooting

### Server won't start
```bash
# Check environment variables
node -e "require('dotenv').config(); console.log(process.env.WALL2_PRIVATE_KEY ? 'OK' : 'MISSING')"

# Test RPC connections
curl -X POST $OP_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Service wallet issues
```bash
# Check wallet balance
# You need ETH for gas fees on both chains
```

### CCTP attestation timeouts
- Increase `CCTP_ATTESTATION_TIMEOUT` in .env (default: 300000ms = 5 minutes)
- Check Circle API status
- Verify transaction was actually sent on source chain

### Events not being detected
- Verify NOWJC contract address is correct
- Check Arbitrum RPC is responding
- Ensure blockchain is synced

## 📝 Logs

The server logs all activities with emojis for easy scanning:
- 🔔 New event detected
- 🔍 Monitoring/polling activity
- ✅ Success
- ⚠️ Warning
- ❌ Error

## 🔒 Security

1. **Never expose private keys**
2. **Use environment variables**
3. **Restrict server access** (firewall, VPN)
4. **Monitor wallet balance** (set up alerts)
5. **Keep dependencies updated**: `npm audit fix`

## 🆘 Support

If you encounter issues:
1. Check logs for error messages
2. Verify configuration in `.env`
3. Test RPC connections
4. Ensure service wallet has sufficient gas
5. Check Circle API status

## 📄 License

MIT
