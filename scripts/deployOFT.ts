import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers, network, run } from 'hardhat'
import { WONKA_ADDRESS, USDC_ADDRESS, LZEndpointAddress, chainId } from './address'

// npx hardhat run scripts/deployOFT.ts --network fuji

async function main(): Promise<void> {
  const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay * 1000))

  const [deployer] = await ethers.getSigners()
  if (deployer === undefined) throw new Error('Deployer is undefined.')
  console.log('Account balance:', (await deployer.getBalance()).toString())

  const lzEndpointAddress = LZEndpointAddress[chainId]

  // const Mock_USDC = await ethers.getContractFactory('MockUSDC')
  // const Mock_USDC_Deployed = await Mock_USDC.deploy('USDC', 'USDC', parseUnits('10000', 6))
  // console.log('Mock_USDC_Deployed.address', Mock_USDC_Deployed.address)

  // const WonkaOFT = await ethers.getContractFactory('WonkaOFT')
  // const WonkaOFT_Deployed = await WonkaOFT.deploy(
  //   'WonkaOFT',
  //   'WonkaOFT',
  //   lzEndpointAddress,
  //   deployer.address,
  //   parseEther('10000'),
  // )
  // console.log('WonkaOFT_Deployed.address', WonkaOFT_Deployed.address)

  await verify(USDC_ADDRESS[chainId], ['USDC', 'USDC', parseUnits('10000', 6)])
  await verify(WONKA_ADDRESS[chainId], ['WonkaOFT', 'WonkaOFT', lzEndpointAddress, deployer.address, parseEther('10000')])
}

const verify = async (contractAddress: string, args: any[]) => {
  console.log('Verifying contract...')
  try {
    await run('verify:verify', {
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

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
