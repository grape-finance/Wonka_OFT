import { ParamType } from '@ethersproject/abi'
import { BaseContract, BigNumber, Contract } from 'ethers'
import { DeployFunction, DeployOptions } from 'hardhat-deploy/types'
import hre, { deployments, ethers, network } from 'hardhat'

export const BASE_TEN = 10

export function encodeParameters(types: readonly (string | ParamType)[], values: readonly any[]) {
  const abi = new ethers.utils.AbiCoder()
  return abi.encode(types, values)
}

export const impersonate = async (address: string) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })
}

// Defaults to e18 using amount * 10^18
export function getBigNumber(amount: any, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals))
}

const MimAddresses = {
  '1': '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
  '43114': '0x130966628846BFd36ff31a822705796e8cb8C18D',
  '250': '0x82f0B8B456c1A451378467398982d4834b6829c1',
  '42161': '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
}

const SpellAddresses = {
  '1': '0x090185f2135308BaD17527004364eBcC2D37e5F6',
  '43114': '0xCE1bFFBD5374Dac86a2893119683F4911a2F7814',
  '250': '0x468003B688943977e6130F4F68F23aad939a1040',
  '42161': '0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF',
}

const ChainName = {
  '1': 'Mainnet',
  '43114': 'Avax',
  '250': 'Fantom',
  '42161': 'Arbitrum',
}

export { MimAddresses, SpellAddresses, ChainName }

export enum ChainId {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  Goerli = 5,
  Kovan = 42,
  BSC = 56,
  BSCTestnet = 97,
  xDai = 100,
  Polygon = 137,
  Theta = 361,
  ThetaTestnet = 365,
  Moonriver = 1285,
  Mumbai = 80001,
  Harmony = 1666600000,
  Palm = 11297108109,
  Localhost = 1337,
  Hardhat = 31337,
  Fantom = 250,
  Arbitrum = 42161,
  Avalanche = 43114,
  Boba = 288,
}

export const setDeploymentSupportedChains = (supportedChains: string[], deployFunction: DeployFunction) => {
  if (network.name !== 'hardhat' || process.env.HARDHAT_LOCAL_NODE) {
    deployFunction.skip = ({ getChainId }) =>
      new Promise(async (resolve, reject) => {
        try {
          getChainId().then((chainId) => {
            resolve(supportedChains.indexOf(chainId.toString()) === -1)
          })
        } catch (error) {
          reject(error)
        }
      })
  }
}

export async function wrappedDeploy<T extends Contract>(name: string, options: DeployOptions): Promise<Contract> {
  const deployment = await hre.deployments.deploy(name, options)
  const contract = await ethers.getContractAt(name, deployment.address)

  if (deployment.newlyDeployed) {
    await verifyContract(contract.address, options.args || [])
  }

  return contract
}

export async function verifyContract(contractAddress: string, args: any[]) {
  console.log('Verifying contract...')
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (e: any) {
    if (e.message.toLowerCase().includes('already verified')) {
      console.log('Already verified!')
    } else {
      console.log(e)
    }
  }
}

export * from './time'
// export * from "./whitelistedMerkle";
