import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers, network, run } from 'hardhat'
import contractAddr from './address.json'

// npx hardhat run scripts/deployOFT.ts --network sepolia

async function main(): Promise<void> {
  const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay * 1000))

  const [deployer] = await ethers.getSigners()
  if (deployer === undefined) throw new Error('Deployer is undefined.')
  console.log('Account balance:', (await deployer.getBalance()).toString())

  const Mock_USDC = await ethers.getContractFactory('MockUSDC')
  const Mock_USDC_Deployed = await Mock_USDC.deploy('USDC', 'USDC', parseUnits('10000', 6))
  console.log('Mock_USDC_Deployed.address', Mock_USDC_Deployed.address)

  // const StartContract = await ethers.getContractAt('MockERC20', "0x2df77eE5a6FcF23F666650ed53bE071E7288eCb6")

  // await StartContract.mint(deployer.address, parseEther("100"))

  // let OFTendPointAddr = '0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1'

  // const WonkaOFT = await ethers.getContractFactory('WonkaOFT')
  // const WonkaOFT_Deployed = await WonkaOFT.deploy(
  //   'WonkaOFT',
  //   'WonkaOFT',
  //   OFTendPointAddr,
  //   deployer.address,
  //   parseEther('10000'),
  // )
  // console.log('WonkaOFT_Deployed.address', WonkaOFT_Deployed.address)

  // await sleep(20)

  await verify(Mock_USDC_Deployed.address, ['USDC', 'USDC', parseUnits('10000', 6)])
  // await verify(contractAddr.WonkaOFT, [
  //   'WonkaOFT',
  //   'WonkaOFT',
  //   OFTendPointAddr,
  //   deployer.address,
  //   parseEther('10000'),
  // ])

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
