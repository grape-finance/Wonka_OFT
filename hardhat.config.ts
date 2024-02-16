import path from 'path'
import fs from 'fs'
import { HardhatUserConfig } from 'hardhat/types'
// @ts-ignore
import { accounts } from './test-wallets.js'
import { eAvalancheNetwork, eEthereumNetwork, eNetwork, ePolygonNetwork, eXDaiNetwork } from './helpers/types'
import { BUIDLEREVM_CHAINID, COVERAGE_CHAINID } from './helpers/buidler-constants'
import { NETWORKS_RPC_URL, NETWORKS_DEFAULT_GAS, BLOCK_TO_FORK, buildForkConfig } from './helper-hardhat-config'

require('dotenv').config()

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
// import "@nomiclabs/hardhat-web3";
import '@openzeppelin/hardhat-upgrades'
// import 'temp-hardhat-etherscan';
import 'hardhat-deploy'
// import "hardhat-deploy-ethers";
import 'hardhat-gas-reporter'
// import 'hardhat-typechain';
import '@typechain/hardhat'
import '@tenderly/hardhat-tenderly'
import 'solidity-coverage'
import { fork } from 'child_process'

const SKIP_LOAD = process.env.SKIP_LOAD === 'true'
const DEFAULT_BLOCK_GAS_LIMIT = 8000000
const DEFAULT_GAS_MUL = 5
const HARDFORK = 'istanbul'
const MNEMONIC_PATH = "m/44'/60'/0'/0"
const MNEMONIC = process.env.MNEMONIC || ''
const UNLIMITED_BYTECODE_SIZE = process.env.UNLIMITED_BYTECODE_SIZE === 'true'

// Prevent to load scripts before compilation and typechain
// if (!SKIP_LOAD) {
//   ['misc', 'dev', 'full', 'full/loop', 'full/oracle', 'full/reward', 'verifications', 'deployments', 'helpers'].forEach((folder) => {
//     const tasksPath = path.join(__dirname, 'tasks', folder);
//     fs.readdirSync(tasksPath)
//       .filter((pth) => pth.includes('.ts'))
//       .forEach((task) => {
//         require(`${tasksPath}/${task}`);
//       });
//   });
// }

require(`${path.join(__dirname, 'tasks/misc')}/set-bre.ts`)

const getCommonNetworkConfig = (networkName: eNetwork, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName],
  hardfork: HARDFORK,
  blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
  gasMultiplier: DEFAULT_GAS_MUL,
  gasPrice: NETWORKS_DEFAULT_GAS[networkName],
  chainId: networkId,
  accounts: {
    mnemonic: MNEMONIC,
    path: MNEMONIC_PATH,
    initialIndex: 0,
    count: 20,
  },
})

let forkMode

const buidlerConfig: HardhatUserConfig = {
  solidity: {
    // version: '0.8.12',
    compilers: [
      {
        version: '0.8.12',
        settings: {
          evmVersion: 'istanbul',
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  etherscan: {
    customChains: [],
    apiKey: {
      mainnet: 'XFAGSFB6UXE9MFTA9AHJMGHMXI8IXRVCHW',
      goerli: 'XFAGSFB6UXE9MFTA9AHJMGHMXI8IXRVCHW',
      bsc: 'A263TZTNDWUC9NKI1AMBVJJC8H3SA547AF',
      bscTestnet: 'A263TZTNDWUC9NKI1AMBVJJC8H3SA547AF',
      avalanche: 'WN8CWW97AHIYUBC665Y4HZ4E5V4GUJZR2Y',
      avalancheFujiTestnet: 'WN8CWW97AHIYUBC665Y4HZ4E5V4GUJZR2Y',
    },
  },
  mocha: {
    timeout: 0,
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT || '',
    username: process.env.TENDERLY_USERNAME || '',
    forkNetwork: '1', //Network id of the network we want to fork
  },
  networks: {
    coverage: {
      url: 'http://localhost:8555',
      chainId: COVERAGE_CHAINID,
    },
    kovan: getCommonNetworkConfig(eEthereumNetwork.kovan, 42),
    ropsten: getCommonNetworkConfig(eEthereumNetwork.ropsten, 3),
    main: getCommonNetworkConfig(eEthereumNetwork.main, 1),
    tenderly: getCommonNetworkConfig(eEthereumNetwork.tenderly, 3030),
    matic: getCommonNetworkConfig(ePolygonNetwork.matic, 137),
    mumbai: getCommonNetworkConfig(ePolygonNetwork.mumbai, 80001),
    xdai: getCommonNetworkConfig(eXDaiNetwork.xdai, 100),
    avalanche: getCommonNetworkConfig(eAvalancheNetwork.avalanche, 43114),
    fuji: getCommonNetworkConfig(eAvalancheNetwork.fuji, 43113),
    goerli: getCommonNetworkConfig(eEthereumNetwork.goerli, 5),
    hardhat: {
      // hardfork: 'istanbul',
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: 8000000000,
      allowUnlimitedContractSize: UNLIMITED_BYTECODE_SIZE,
      chainId: BUIDLEREVM_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      // forking: buildForkConfig(),
    },
    buidlerevm_docker: {
      hardfork: 'istanbul',
      blockGasLimit: 9500000,
      gas: 9500000,
      gasPrice: 8000000000,
      chainId: BUIDLEREVM_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      url: 'http://localhost:8545',
    },
    ganache: {
      url: 'http://ganache:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
  },
}

export default buidlerConfig

// mainnet: "YOUR_ETHERSCAN_API_KEY",
// ropsten: "YOUR_ETHERSCAN_API_KEY",
// rinkeby: "YOUR_ETHERSCAN_API_KEY",
// goerli: "YOUR_ETHERSCAN_API_KEY",
// kovan: "YOUR_ETHERSCAN_API_KEY",
// // binance smart chain
// bsc: "YOUR_BSCSCAN_API_KEY",
// bscTestnet: "YOUR_BSCSCAN_API_KEY",
// // huobi eco chain
// heco: "YOUR_HECOINFO_API_KEY",
// hecoTestnet: "YOUR_HECOINFO_API_KEY",
// // fantom mainnet
// opera: "YOUR_FTMSCAN_API_KEY",
// ftmTestnet: "YOUR_FTMSCAN_API_KEY",
// // optimism
// optimisticEthereum: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",
// optimisticKovan: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",
// // polygon
// polygon: "YOUR_POLYGONSCAN_API_KEY",
// polygonMumbai: "YOUR_POLYGONSCAN_API_KEY",
// // arbitrum
// arbitrumOne: "YOUR_ARBISCAN_API_KEY",
// arbitrumTestnet: "YOUR_ARBISCAN_API_KEY",
// // avalanche
// avalanche: "YOUR_SNOWTRACE_API_KEY",
// avalancheFujiTestnet: "YOUR_SNOWTRACE_API_KEY",
// // moonbeam
// moonbeam: "YOUR_MOONBEAM_MOONSCAN_API_KEY"
// moonriver: "YOUR_MOONRIVER_MOONSCAN_API_KEY",
// moonbaseAlpha: "YOUR_MOONBEAM_MOONSCAN_API_KEY",
// // harmony
// harmony: "YOUR_HARMONY_API_KEY",
// harmonyTest: "YOUR_HARMONY_API_KEY",
// // xdai and sokol don't need an API key, but you still need
// // to specify one; any string placeholder will work
// xdai: "api-key",
// sokol: "api-key",
// aurora: "api-key",
// auroraTestnet: "api-key",
