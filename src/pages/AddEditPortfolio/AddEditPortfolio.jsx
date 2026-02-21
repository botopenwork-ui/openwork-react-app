import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  uploadFileToIPFS, 
  uploadJSONToIPFS
} from "../../services/portfolioService";
import BlueButton from "../../components/BlueButton/BlueButton";
import Button from "../../components/Button/Button";
import Warning from "../../components/Warning/Warning";
import "./AddEditPortfolio.css";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getLOWJCContract } from "../../services/localChainService";
import CrossChainStatus, { buildLZSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, STATUS } from "../../utils/crossChainMonitor";

export default function AddEditPortfolio() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Multi-chain hooks
  const { chainId, chainConfig, isAllowed, error: chainError } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  
  const isEditMode = !!id;
  const existingData = location.state?.portfolioData;

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);

  const [projectName, setProjectName] = useState(existingData?.title || "Project Name");
  const [description, setDescription] = useState(existingData?.description || "");
  const [skills, setSkills] = useState(existingData?.skills || ["UX Design", "UI Design"]);
  const [images, setImages] = useState(existingData?.images || []);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState("");
  const [crossChainSteps, setCrossChainSteps] = useState(null);

  function formatWalletAddress(address) {
    if (!address) return "0xfd08...024a";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}...${end}`;
  }

  const handleCopyToClipboard = () => {
    const address = walletAddress || "0xfd08...024a";
    navigator.clipboard.writeText(address);
  };

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadFileToIPFS(file));
      const ipfsHashes = await Promise.all(uploadPromises);
      setImages([...images, ...ipfsHashes]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleChangeImage = async (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setUploadingImages(true);
        try {
          const ipfsHash = await uploadFileToIPFS(file);
          const updatedImages = [...images];
          updatedImages[index] = ipfsHash;
          setImages(updatedImages);
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image.');
        } finally {
          setUploadingImages(false);
        }
      }
    };
    input.click();
  };

  const handleDeleteImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    if (selectedImage >= updatedImages.length) {
      setSelectedImage(Math.max(0, updatedImages.length - 1));
    }
  };

  const handleSave = async () => {
    if (!walletAddress) {
      setTransactionStatus("❌ Please connect your wallet first");
      return;
    }
    
    if (!isAllowed) {
      setTransactionStatus(chainConfig?.reason || "Transactions not allowed on this network. Please switch to OP Sepolia or Ethereum Sepolia.");
      return;
    }

    if (!projectName.trim() || projectName === "Project Name") {
      setTransactionStatus("❌ Please enter a project name");
      return;
    }

    if (images.length === 0) {
      setTransactionStatus("❌ Please add at least one image");
      return;
    }

    setLoading(true);
    setTransactionStatus(`Preparing portfolio on ${chainConfig.name}...`);

    try {
      const portfolioData = {
        title: projectName,
        description: description,
        skills: skills,
        images: images,
        createdFromChain: chainConfig?.name,
        createdFromChainId: chainId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setTransactionStatus('📤 Uploading portfolio data to IPFS...');
      const portfolioHash = await uploadJSONToIPFS(
        portfolioData,
        `portfolio-${projectName.replace(/\s+/g, '-')}-${Date.now()}.json`
      );


      // Get contract and LayerZero options
      const web3 = new Web3(window.ethereum);
      const lowjcContract = await getLOWJCContract(chainId);
      const lzOptions = chainConfig.layerzero.options;

      // Get LayerZero fee
      setTransactionStatus(`💰 Getting LayerZero fee quote on ${chainConfig.name}...`);
      const bridgeAddress = await lowjcContract.methods.bridge().call();
      const bridgeABI = [{
        "inputs": [{"type": "bytes"}, {"type": "bytes"}],
        "name": "quoteNativeChain",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }];
      
      const bridgeContract = new web3.eth.Contract(bridgeABI, bridgeAddress);
      
      const payload = isEditMode
        ? web3.eth.abi.encodeParameters(
            ['string', 'address', 'uint256', 'string'],
            ['updatePortfolioItem', walletAddress, parseInt(id), portfolioHash]
          )
        : web3.eth.abi.encodeParameters(
            ['string', 'address', 'string'],
            ['addPortfolio', walletAddress, portfolioHash]
          );
      
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, lzOptions).call();
      console.log(`💰 LayerZero fee: ${web3.utils.fromWei(quotedFee, 'ether')} ETH`);

      // Call contract
      if (isEditMode) {
        setTransactionStatus(`Updating portfolio on ${chainConfig.name}...`);
        await lowjcContract.methods
          .updatePortfolioItem(parseInt(id), portfolioHash, lzOptions)
          .send({ 
            from: walletAddress,
            value: quotedFee,
            gas: 5000000
          });
        setTransactionStatus(`✅ Portfolio updated on ${chainConfig.name}!`);
        const srcTx = receipt.transactionHash;
        const lzLink = `https://layerzeroscan.com/tx/${srcTx}`;
        setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: 'active', lzLink }));
        monitorLZMessage(srcTx, (u) => setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: u.status === STATUS.SUCCESS ? 'delivered' : u.status === STATUS.FAILED ? 'failed' : 'active', lzLink: u.lzLink || lzLink, dstTxHash: u.dstTxHash, dstChainId: 42161 })));
      } else {
        setTransactionStatus(`Adding portfolio on ${chainConfig.name}...`);
        await lowjcContract.methods
          .addPortfolio(portfolioHash, lzOptions)
          .send({ 
            from: walletAddress,
            value: quotedFee,
            gas: 5000000
          });
        setTransactionStatus(`✅ Portfolio added on ${chainConfig.name}!`);
        const srcTx = receipt.transactionHash;
        const lzLink = `https://layerzeroscan.com/tx/${srcTx}`;
        setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: 'active', lzLink }));
        monitorLZMessage(srcTx, (u) => setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: u.status === STATUS.SUCCESS ? 'delivered' : u.status === STATUS.FAILED ? 'failed' : 'active', lzLink: u.lzLink || lzLink, dstTxHash: u.dstTxHash, dstChainId: 42161 })));
      }

      setTimeout(() => navigate("/profile-portfolio"), 2000);
      
    } catch (error) {
      console.error("Error saving portfolio:", error);
      
      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      }
      
      setTransactionStatus(`❌ ${errorMessage}`);
      setLoading(false);
    }
  };

  return (
    <div className="addedit-portfolio-wrapper">
      <div className="addedit-portfolio-container">
        
        {/* Header Section - Outside any card */}
        <div className="addedit-header-section">
          <button className="addedit-back-button" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15.8332 10.0003H4.1665M4.1665 10.0003L9.99984 15.8337M4.1665 10.0003L9.99984 4.16699" 
                    stroke="#767676" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="addedit-title-section">
            {isEditingName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                className="addedit-title-input"
                autoFocus
              />
            ) : (
              <h1 className="addedit-title">
                {projectName}
                <img 
                  src="/edit.svg" 
                  alt="Edit" 
                  className="addedit-edit-icon"
                  onClick={() => setIsEditingName(true)}
                />
              </h1>
            )}
            <div className="addedit-contract-row">
              <span>Contract ID: {formatWalletAddress(walletAddress)}</span>
              <img 
                src="/copy.svg" 
                className="addedit-copy-icon" 
                onClick={handleCopyToClipboard}
                alt="Copy"
              />
            </div>
          </div>
        </div>

        {/* Skills Bar - Horizontal row */}
        <div className="addedit-skills-bar">
          {skills.map((skill, index) => (
            <div key={index} className="addedit-skill-badge">{skill}</div>
          ))}
          <Button label="Change" buttonCss="addedit-change-btn" />
          <Button label="Delete" buttonCss="addedit-delete-btn" />
        </div>

        {/* Image Upload/Display Card - Separate white box */}
        <div className="addedit-image-card">
          {images.length > 0 ? (
            <>
              <div className="addedit-main-image">
                <img
                  src={`https://gateway.lighthouse.storage/ipfs/${images[selectedImage]}`}
                  alt="Work preview"
                />
                <div className="image-overlay-actions">
                  <Button 
                    label="Change"
                    buttonCss="addedit-change-btn"
                    onClick={() => handleChangeImage(selectedImage)}
                  />
                  <Button 
                    label="Delete"
                    buttonCss="addedit-delete-btn"
                    onClick={() => handleDeleteImage(selectedImage)}
                  />
                </div>
              </div>

              {/* Gallery Thumbnails */}
              <div className="addedit-image-gallery">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`gallery-thumbnail ${selectedImage === index ? "active" : ""}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={`https://gateway.lighthouse.storage/ipfs/${image}`} alt={`Thumbnail ${index + 1}`} />
                  </div>
                ))}
                <div 
                  className="gallery-add-more"
                  onClick={() => {
                    console.log('Add more clicked!');
                    addMoreInputRef.current?.click();
                  }}
                >
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div className="add-more-label">
                    <img src="/plus.svg" alt="Add" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div 
              className="addedit-upload-area" 
              onClick={() => {
                console.log('Upload area clicked!');
                fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <div className="upload-label">
                <img src="/upload-icon.svg" alt="Upload" />
                <span>Click to upload images</span>
              </div>
            </div>
          )}
        </div>

        {/* Description Card - Separate white box */}
        <div className="addedit-description-card">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter project description..."
            className="description-textarea"
          />
        </div>

        {/* Status and Submit Section */}
        {chainError && (
          <div className="warning-form" style={{marginBottom: '12px'}}>
            <Warning content={chainError} icon="/triangle_warning.svg" />
          </div>
        )}
        {!isAllowed && chainConfig?.reason && (
          <div className="warning-form" style={{marginBottom: '12px'}}>
            <Warning content={chainConfig.reason} icon="/triangle_warning.svg" />
          </div>
        )}
        {chainConfig && isAllowed && (
          <div className="warning-form" style={{marginBottom: '12px'}}>
            <Warning content={`Connected to ${chainConfig.name}`} icon="/info.svg" />
          </div>
        )}
        {transactionStatus && (
          <div className="warning-form" style={{marginBottom: '12px'}}>
            <Warning content={transactionStatus} />
          </div>
        )}
        {crossChainSteps && (
          <CrossChainStatus title="Portfolio sync status" steps={crossChainSteps} />
        )}
        
        <div className="addedit-submit-section">
          <BlueButton
            label={loading ? "Saving..." : "Send changes"}
            onClick={handleSave}
            disabled={loading || !isAllowed}
          />
        </div>

      </div>
    </div>
  );
}
