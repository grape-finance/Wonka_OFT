import { expect } from 'chai'
import { deployments, ethers, network, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { time, mine } from '@nomicfoundation/hardhat-network-helpers'
import { BigNumber } from 'ethers'
import { keccak256, toBuffer, ecsign, bufferToHex, MAX_INTEGER } from 'ethereumjs-util'
import { MockERC20, MockUSDC, Presale, WonkaOFT } from '../typechain'
import { execPath } from 'process'
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils'

describe('test', function () {
  // Account
  let owner: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let quinn: SignerWithAddress

  // Contract
  let USDC: MockUSDC
  let WONKA: WonkaOFT
  let PresaleContract: Presale

  let USDCDecimal

  before(async () => {
    const signers = await ethers.getSigners()
    owner = signers[0]
    alice = signers[1]
    bob = signers[2]
    quinn = signers[3]

    // Deploy tokens
    let receipt = await deployments.deploy('MockUSDC', {
      from: owner.address,
      args: ['USDC', 'USDC', ethers.utils.parseUnits('10000', 6)],
      log: true,
    })
    USDC = await ethers.getContractAt('MockUSDC', receipt.address)

    let OFTendPointAddr = '0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23'

    receipt = await deployments.deploy('WonkaOFT', {
      from: owner.address,
      args: ['WonkaOFT', 'WonkaOFT', OFTendPointAddr, owner.address, parseEther('1000')],
      log: true,
    })
    WONKA = await ethers.getContractAt('WonkaOFT', receipt.address)
    // Deploy Bomb Token
    receipt = await deployments.deploy('Presale', {
      from: owner.address,
      log: true,
    })
    PresaleContract = await ethers.getContractAt('Presale', receipt.address)
  })
  describe('Deploy contract', async () => {
    it('should be deployed', async () => {})
  })
  describe('Presale', async () => {
    it('Initialize', async function () {
      USDCDecimal = await USDC.decimals()

      let capPerLevel: BigNumber[] = []
      let price: BigNumber[] = []
      let hardcap: BigNumber = BigNumber.from(0)

      for (let i = 0; i < 8; i++) {
        if (i == 0) {
          capPerLevel[i] = parseUnits('1000', USDCDecimal)
          price[i] = parseUnits('100', 18 - USDCDecimal)
        } else {
          capPerLevel[i] = capPerLevel[i - 1].mul(BigNumber.from(12)).div(BigNumber.from(10))
          price[i] = price[i - 1].mul(BigNumber.from(10)).div(BigNumber.from(12))
          hardcap = hardcap.add(capPerLevel[i])
        }
      }
      let PresaleConfig = {
        usdc: USDC.address,
        presaleToken: WONKA.address, // WonkaOFT token address
        startTime: Math.floor(Date.now() / 1000), // now
        endTime: Math.floor(Date.now() / 1000) + 8 * 7 * 24 * 60 * 60, // 8 weeks
        softcap: parseUnits('1000', USDCDecimal),
        hardcap,
        minContribution: parseUnits('200', USDCDecimal),
        maxContribution: parseUnits('2000', USDCDecimal),
        // price: price, //  1 Wonka = 0.01$ , increasing 1.2x per level
        // capPerLevel: capPerLevel,
      }

      await PresaleContract.initialize(PresaleConfig, price, capPerLevel)

      // const config = await PresaleContract.presaleConfig()
      // console.log('config', config)
      let _price  = await PresaleContract.price(0);

      console.log('_price', +_price)
      _price  = await PresaleContract.price(1);
      console.log('_price', +_price)

      await expect(PresaleContract.initialize(PresaleConfig, price, capPerLevel)).to.be.reverted

      await WONKA.mint(PresaleContract.address, parseEther('2000000'))

      await USDC.connect(alice).mintTokens(parseUnits('2000', USDCDecimal))
      await USDC.connect(bob).mintTokens(parseUnits('2000', USDCDecimal))
      await USDC.connect(quinn).mintTokens(parseUnits('2000', USDCDecimal))
    })
    it('Check Config', async function () {
      const config = await PresaleContract.presaleConfig()
    })
    it('Contribute', async function () {
      await ethers.provider.send('evm_increaseTime', [60])

      await USDC.connect(alice).approve(PresaleContract.address, parseUnits('1000', USDCDecimal))
      await USDC.connect(bob).approve(PresaleContract.address, parseUnits('1000', USDCDecimal))
      await USDC.connect(quinn).approve(PresaleContract.address, parseUnits('2000', USDCDecimal))

      await expect(PresaleContract.connect(alice).contribute(parseUnits('100', USDCDecimal))).to.be.reverted
      await expect(PresaleContract.connect(alice).contribute(parseUnits('3000', USDCDecimal))).to.be.reverted

      await PresaleContract.connect(alice).contribute(parseUnits('1000', USDCDecimal))
      await PresaleContract.connect(bob).contribute(parseUnits('1000', USDCDecimal))

      await expect(PresaleContract.connect(bob).contribute(parseUnits('1000', USDCDecimal))).to.be.reverted
      
    })
    it('Check Presale Level', async function () {
      let level = await PresaleContract.presaleLevel()
      console.log('level', level)
      const aWeeksInSeconds = 7 * 24 * 60 * 60 // 3 days * 24 hours * 60 minutes * 60 seconds

      // Increase the EVM time to the future timestamp
      await ethers.provider.send('evm_increaseTime', [aWeeksInSeconds])

      await PresaleContract.updatePresaleStatus()

      level = await PresaleContract.presaleLevel()
      console.log('level', level)

      await PresaleContract.connect(quinn).contribute(parseUnits('1000', USDCDecimal))

      level = await PresaleContract.presaleLevel()
      console.log('level', level)
    })
    it('Claim', async function () {
      await PresaleContract.setPresaleStatus(1)

      // console.log('WonkaBal', +(await WONKA.balanceOf(PresaleContract.address)))
      // console.log('funder', await PresaleContract.funders(alice.address))

      await PresaleContract.connect(alice).claim()
      await PresaleContract.connect(bob).claim()
      await PresaleContract.connect(quinn).claim()

      // console.log('aliceBal', +(await WONKA.balanceOf(alice.address)))
      // console.log('bobBal', +(await WONKA.balanceOf(bob.address)))
      // console.log('quinnBal', +(await WONKA.balanceOf(quinn.address)))

      await expect(PresaleContract.connect(alice).claim()).to.be.revertedWith('You are not a funder')
    })
    it('Admin Claim', async function () {
      await PresaleContract.adminClaim(USDC.address, owner.address, await USDC.balanceOf(PresaleContract.address))
      await PresaleContract.adminClaim(WONKA.address, owner.address, await USDC.balanceOf(PresaleContract.address))
    })
  })
})
