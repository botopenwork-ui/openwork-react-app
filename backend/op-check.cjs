const { ethers } = require('ethers');

async function main() {
  // Use public OP RPC
  const provider = new ethers.JsonRpcProvider('https://mainnet.optimism.io');
  const abi = [
    'event JobPosted(string jobId, address indexed jobGiver, string jobDetailHash)',
    'event JobStarted(string jobId, uint256 appId, address applicant, bool useAppMilestones)'
  ];
  const lowjc = new ethers.Contract('0x620205A4Ff0E652fF03a890d2A677de878a1dB63', abi, provider);

  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);

  // Scan in chunks of 2000 blocks, last 200k blocks total (~4 days on OP)
  const chunkSize = 2000;
  const totalBlocks = 200000;
  const fromBlock = currentBlock - totalBlocks;
  
  let totalPosted = 0, totalStarted = 0;
  let firstJob = null, lastJob = null;
  const startedJobs = [];

  for (let b = fromBlock; b < currentBlock; b += chunkSize) {
    const end = Math.min(b + chunkSize - 1, currentBlock);
    try {
      const posted = await lowjc.queryFilter(lowjc.filters.JobPosted(), b, end);
      const started = await lowjc.queryFilter(lowjc.filters.JobStarted(), b, end);
      totalPosted += posted.length;
      totalStarted += started.length;
      if (posted.length > 0) {
        if (!firstJob) firstJob = posted[0].args.jobId;
        lastJob = posted[posted.length-1].args.jobId;
      }
      started.forEach(e => startedJobs.push(e.args.jobId));
    } catch(e) {
      process.stdout.write('!');
    }
    process.stdout.write('.');
  }
  
  console.log('\n\nResults (last 200k blocks):');
  console.log('JobPosted:', totalPosted, firstJob ? `(${firstJob} → ${lastJob})` : '');
  console.log('JobStarted:', totalStarted);
  if (startedJobs.length > 0) console.log('Started jobs:', startedJobs);
  else console.log('No JobStarted events found');
}
main().catch(console.error);
