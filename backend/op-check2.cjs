const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.optimism.io');
  const abi = [
    'event JobPosted(string jobId, address indexed jobGiver, string jobDetailHash)',
    'event JobStarted(string jobId, uint256 appId, address applicant, bool useAppMilestones)'
  ];
  const lowjc = new ethers.Contract('0x620205A4Ff0E652fF03a890d2A677de878a1dB63', abi, provider);

  const currentBlock = await provider.getBlockNumber();
  // Deployed ~Jan 23. OP ~2 blocks/sec. 37 days back from Mar 1 = ~6.4M blocks
  const fromBlock = currentBlock - 7000000; // ~40 days back
  console.log('Scanning from block', fromBlock, 'to', currentBlock, '(~7M blocks, ~40 days)');

  const chunkSize = 10000;
  let totalPosted = 0, totalStarted = 0;
  let firstJob = null, lastJob = null;
  const startedJobs = [];
  let chunks = 0;

  for (let b = fromBlock; b < currentBlock; b += chunkSize) {
    const end = Math.min(b + chunkSize - 1, currentBlock);
    try {
      const [posted, started] = await Promise.all([
        lowjc.queryFilter(lowjc.filters.JobPosted(), b, end),
        lowjc.queryFilter(lowjc.filters.JobStarted(), b, end)
      ]);
      totalPosted += posted.length;
      totalStarted += started.length;
      if (posted.length > 0) {
        if (!firstJob) firstJob = posted[0].args.jobId;
        lastJob = posted[posted.length-1].args.jobId;
      }
      started.forEach(e => startedJobs.push(e.args.jobId));
    } catch(e) {
      // skip chunk on error
    }
    chunks++;
    if (chunks % 50 === 0) process.stdout.write(`[${chunks*chunkSize/1000}k blocks done] `);
  }
  
  console.log('\n\nFinal Results:');
  console.log('JobPosted:', totalPosted, firstJob ? `(${firstJob} → ${lastJob})` : '');
  console.log('JobStarted:', totalStarted);
  if (startedJobs.length > 0) console.log('Started jobs:', startedJobs);
  else console.log('No JobStarted events found on OP LOWJC');
}
main().catch(console.error);
