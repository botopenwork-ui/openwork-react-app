const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '../../openclaw-skill');
const REFS_DIR = path.join(SKILL_DIR, 'references');

/**
 * Helper: read a markdown file and return its content
 */
function readMarkdown(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/docs
 * Returns a summary of all available documentation sections with links
 */
router.get('/', (req, res) => {
  res.json({
    name: 'OpenWork Documentation API',
    description: 'Machine-readable documentation for the OpenWork decentralized freelancing protocol. Designed for AI agents (OpenClaw, etc.) that cannot render client-side JavaScript.',
    sections: {
      skill: {
        description: 'OpenClaw skill package — main overview with capabilities, workflows, and contract addresses',
        endpoint: '/api/docs/skill'
      },
      references: {
        description: 'Detailed reference docs for each subsystem',
        endpoint: '/api/docs/references',
        topics: [
          'cross-chain-architecture',
          'job-creation-management',
          'direct-contracts',
          'payment-system',
          'membership-governance',
          'oracle-skill-verification',
          'rewards-system',
          'profile-management',
          'contract-registry',
          'error-reference'
        ]
      },
      contracts: {
        description: 'Quick-reference contract addresses for all chains',
        endpoint: '/api/docs/contracts'
      },
      full: {
        description: 'Complete documentation bundle — SKILL.md + all references in one response',
        endpoint: '/api/docs/full'
      }
    },
    repos: {
      app: 'https://github.com/AnasShaikh/openwork-react-app',
      skill: 'https://github.com/AnasShaikh/openwork-react-app/tree/main/openclaw-skill'
    }
  });
});

/**
 * GET /api/docs/skill
 * Returns the main SKILL.md content
 */
router.get('/skill', (req, res) => {
  const content = readMarkdown(path.join(SKILL_DIR, 'SKILL.md'));
  if (!content) {
    return res.status(404).json({ error: 'SKILL.md not found' });
  }

  const format = req.query.format || 'markdown';
  if (format === 'json') {
    res.json({ file: 'SKILL.md', content });
  } else {
    res.type('text/markdown').send(content);
  }
});

/**
 * GET /api/docs/references
 * Returns a list of all reference documents
 */
router.get('/references', (req, res) => {
  try {
    const files = fs.readdirSync(REFS_DIR).filter(f => f.endsWith('.md'));
    const references = files.map(file => ({
      name: file.replace('.md', ''),
      file,
      endpoint: `/api/docs/references/${file.replace('.md', '')}`
    }));
    res.json({ references });
  } catch (err) {
    res.status(500).json({ error: 'Could not read references directory' });
  }
});

/**
 * GET /api/docs/references/:topic
 * Returns a specific reference document
 * e.g. /api/docs/references/payment-system
 */
router.get('/references/:topic', (req, res) => {
  const { topic } = req.params;
  const content = readMarkdown(path.join(REFS_DIR, `${topic}.md`));
  if (!content) {
    return res.status(404).json({ error: `Reference '${topic}' not found` });
  }

  const format = req.query.format || 'markdown';
  if (format === 'json') {
    res.json({ file: `${topic}.md`, content });
  } else {
    res.type('text/markdown').send(content);
  }
});

/**
 * GET /api/docs/contracts
 * Returns key contract addresses as structured JSON
 */
router.get('/contracts', (req, res) => {
  res.json({
    mainnet: {
      arbitrum: {
        chainId: 42161,
        role: 'Native chain — source of truth, escrow, oracle',
        contracts: {
          NativeOpenworkGenesis: '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294',
          NOWJC: '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99',
          NativeOpenworkDAO: '0x24af98d763724362DC920507b351cC99170a5aa4',
          NativeAthena: '0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf',
          NativeProfileGenesis: '0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E',
          NativeAthenaActivityTracker: '0x8C04840c3f5b5a8c44F9187F9205ca73509690EA',
          NativeAthenaOracleManager: '0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15',
          NativeProfileManager: '0x51285003A01319c2f46BB2954384BCb69AfB1b45',
          NativeLZOpenworkBridge: '0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F',
          NativeRewardsContract: '0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9',
          CCTPTransceiver: '0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87',
          NativeContractRegistry: '0x29D61B1a9E2837ABC0810925429Df641CBed58c3',
          NativeGenesisReader: '0x72ee091C288512f0ee9eB42B8C152fbB127Dc782',
          USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
        }
      },
      optimism: {
        chainId: 10,
        role: 'Local chain — user-facing, low gas',
        contracts: {
          LOWJC: '0x620205A4Ff0E652fF03a890d2A677de878a1dB63',
          LocalLZOpenworkBridge: '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36',
          CCTPTransceiver: '0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15',
          LocalAthena: '0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d',
          USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
        }
      },
      ethereum: {
        chainId: 1,
        role: 'Main chain — governance, OWORK token',
        contracts: {
          ETHOpenworkDAO: '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294',
          ETHRewardsContract: '0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d',
          OpenworkToken: '0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87',
          ETHLZOpenworkBridge: '0x20Fa268106A3C532cF9F733005Ab48624105c42F'
        }
      }
    },
    external: {
      LayerZeroEndpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
      chainIdentifiers: {
        arbitrum: { chainId: 42161, lzEid: 30110, cctpDomain: 3 },
        optimism: { chainId: 10, lzEid: 30111, cctpDomain: 2 },
        ethereum: { chainId: 1, lzEid: 30101, cctpDomain: 0 }
      }
    }
  });
});

/**
 * GET /api/docs/full
 * Returns the complete documentation bundle — SKILL.md + all references
 */
router.get('/full', (req, res) => {
  const skill = readMarkdown(path.join(SKILL_DIR, 'SKILL.md'));

  let references = {};
  try {
    const files = fs.readdirSync(REFS_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const name = file.replace('.md', '');
      references[name] = readMarkdown(path.join(REFS_DIR, file));
    }
  } catch (err) {
    // references dir may not exist
  }

  res.json({
    skill: skill || 'SKILL.md not found',
    references,
    repos: {
      app: 'https://github.com/AnasShaikh/openwork-react-app',
      skill: 'https://github.com/AnasShaikh/openwork-react-app/tree/main/openclaw-skill'
    }
  });
});

module.exports = router;
