// Import all contract definitions
import { token } from './token';
import { mainDAO } from './mainDAO';
import { mainRewards } from './mainRewards';
import { mainBridge } from './mainBridge';
import { nowjc } from './nowjc';
import { nativeAthena } from './nativeAthena';
import { nativeDAO } from './nativeDAO';
import { nativeRewards } from './nativeRewards';
import { nativeBridge } from './nativeBridge';
import { cctpTransceiverL2 } from './cctpTransceiverL2';
import { oracleManager } from './oracleManager';
import { openworkGenesis } from './openworkGenesis';
import { profileGenesis } from './profileGenesis';
import { profileManager } from './profileManager';
import { contractRegistry } from './contractRegistry';
import { lowjcOP } from './lowjcOP';
import { athenaClientOP } from './athenaClientOP';
import { localBridgeOP } from './localBridgeOP';
import { cctpTransceiverOP } from './cctpTransceiverOP';
import { lowjcETH } from './lowjcETH';
import { athenaClientETH } from './athenaClientETH';
import { localBridgeETH } from './localBridgeETH';
import { cctpTransceiverETH } from './cctpTransceiverETH';
import { genesisReaderHelper } from './genesisReaderHelper';

// Export aggregated contracts data
export const contractsData = {
  token,
  mainDAO,
  mainRewards,
  mainBridge,
  nowjc,
  nativeAthena,
  nativeDAO,
  nativeRewards,
  nativeBridge,
  cctpTransceiverL2,
  oracleManager,
  openworkGenesis,
  profileGenesis,
  profileManager,
  contractRegistry,
  lowjcOP,
  athenaClientOP,
  localBridgeOP,
  cctpTransceiverOP,
  lowjcETH,
  athenaClientETH,
  localBridgeETH,
  cctpTransceiverETH,
  genesisReaderHelper
};
