import Web3 from "web3";
import JobContractABI from "../JobContractABI.json";

const contractAddress = "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d";

export const handleSubmit = async (e, jobDetails, amount, setLoadingT, navigate, pinJobDetailsToIPFS) => {
  e.preventDefault();

  if (window.ethereum) {
    try {
      setLoadingT(true); // Start loader

      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      const response = await pinJobDetailsToIPFS(jobDetails);

      if (response && response.IpfsHash) {
        const jobDetailHash = response.IpfsHash;
        console.log("IPFS Hash:", jobDetailHash);

        const contract = new web3.eth.Contract(JobContractABI, contractAddress);
        const amountInWei = web3.utils.toWei(amount, "ether");

        contract.methods
          .enterDirectContract(jobDetailHash, jobDetails.jobTaker)
          .send({
            from: fromAddress,
            value: amountInWei,
            gasPrice: await web3.eth.getGasPrice(),
          })
          .on("receipt", function (receipt) {
            const events = receipt.events.ContractEntered;
            if (events && events.returnValues) {
              const jobId = events.returnValues.jobId;
              console.log("Job ID from event:", jobId);
              navigate(`/job-details/${jobId}`);
            }
          })
          .on("error", function (error) {
            console.error("Error sending transaction:", error);
          })
          .finally(() => {
            setLoadingT(false); // Stop loader when done
          });
      } else {
        console.error("Failed to pin job details to IPFS");
        setLoadingT(false); // Stop loader on error
      }
    } catch (error) {
      console.error("Error sending transaction:", error);
      setLoadingT(false); // Stop loader on error
    }
  } else {
    console.error("MetaMask not detected");
    setLoadingT(false); // Stop loader if MetaMask is not detected
  }
};
