import { parseEther, parseUnits } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { ethers, network, run } from 'hardhat'
import contractAddr from './address.json'

// npx hardhat run scripts/deployPresale.ts --network sepolia

async function main(): Promise<void> {
  const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay * 1000))

  const [deployer] = await ethers.getSigners()
  if (deployer === undefined) throw new Error('Deployer is undefined.')
  console.log('Account balance:', (await deployer.getBalance()).toString())

  // const Presale = await ethers.getContractFactory('Presale')
  // const Presale_Deployed = await Presale.deploy()
  // console.log('Presale_Deployed.address', Presale_Deployed.address)

  // await verify(contractAddr.Presale, [])

  const PresaleContract = await ethers.getContractAt('Presale', contractAddr.Presale)

  const USDCDecimal = 6

  let capPerLevel: BigNumber[] = []
  let price: BigNumber[] = []

  let hardcap: BigNumber = BigNumber.from(0)

  for (let i = 0; i < 8; i++) {
    if (i == 0) {
      capPerLevel[i] = parseUnits('1000', USDCDecimal)
      price[i] = parseUnits('100', 18 - USDCDecimal)
    } else {
      capPerLevel[i] = capPerLevel[i - 1].mul(12).div(10)
      price[i] = price[i - 1].mul(BigNumber.from(10)).div(BigNumber.from(12))
    }
    hardcap = hardcap.add(capPerLevel[i])
  }
  let PresaleConfig = {
    usdc: contractAddr.USDC,
    presaleToken: contractAddr.WonkaOFT, // WonkaOFT token address
    // price, //  1 Wonka = 0.01$
    startTime: Math.floor(Date.now() / 1000) + 5 * 60 * 60, // now
    endTime: Math.floor(Date.now() / 1000) + 8 * 7 * 24 * 60 * 60 + 5 * 60 * 60, // 8 weeks
    softcap: parseUnits('1000', USDCDecimal),
    hardcap,
    // capPerLevel,
    minContribution: parseUnits('200', USDCDecimal),
    maxContribution: parseUnits('2000', USDCDecimal),
  }

  await PresaleContract.initialize(PresaleConfig, price, capPerLevel)
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
