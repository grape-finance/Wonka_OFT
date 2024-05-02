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

  const code1="A1B2C"
  const code2="X1Y2Z"

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
      }

      let wonkaPerBlock = parseEther("1")

      await PresaleContract.initialize(PresaleConfig, price, capPerLevel, wonkaPerBlock)

      // const config = await PresaleContract.presaleConfig()
      // console.log('config', config)
      let _price  = await PresaleContract.wonkaPrice(0);
      console.log('_price', +_price)
      _price  = await PresaleContract.wonkaPrice(1);
      console.log('_price', +_price)

      await expect(PresaleContract.initialize(PresaleConfig, price, capPerLevel, wonkaPerBlock)).to.be.reverted

      await WONKA.mint(PresaleContract.address, parseEther('2000000'))

      await USDC.connect(alice).mintTokens(parseUnits('2000', USDCDecimal))
      await USDC.connect(bob).mintTokens(parseUnits('2000', USDCDecimal))
      await USDC.connect(quinn).mintTokens(parseUnits('2000', USDCDecimal))
    })
    it('Check Config', async function () {
      const config = await PresaleContract.presaleConfig()
    })
    it('Contribute', async function () {
      await ethers.provider.send('evm_increaseTime', [60 * 60])

      await USDC.connect(alice).approve(PresaleContract.address, parseUnits('1000', USDCDecimal))
      await USDC.connect(bob).approve(PresaleContract.address, parseUnits('1000', USDCDecimal))
      await USDC.connect(quinn).approve(PresaleContract.address, parseUnits('2000', USDCDecimal))

      await expect(PresaleContract.connect(alice).contribute(parseUnits('100', USDCDecimal), code1)).to.be.reverted
      await expect(PresaleContract.connect(alice).contribute(parseUnits('3000', USDCDecimal), code1)).to.be.reverted

      await PresaleContract.connect(alice).contribute(parseUnits('300', USDCDecimal), code1)
      await PresaleContract.connect(bob).contribute(parseUnits('300', USDCDecimal), code1)
      await PresaleContract.connect(quinn).contribute(parseUnits('300', USDCDecimal), code2)
      // await expect(PresaleContract.connect(bob).contribute(parseUnits('1000', USDCDecimal))).to.be.reverted
      
    })
    it('Check Presale Level', async function () {
      let level = await PresaleContract.poolInfo()
      console.log('level', level.presaleLevel)
      const aWeeksInSeconds = 7 * 24 * 60 * 60 // 3 days * 24 hours * 60 minutes * 60 seconds

      // Increase the EVM time to the future timestamp
      await ethers.provider.send('evm_increaseTime', [aWeeksInSeconds])

      await PresaleContract.updatePresaleLevel()

      level = await PresaleContract.poolInfo()
      console.log('level', level.presaleLevel)

      // await PresaleContract.connect(quinn).contribute(parseUnits('1000', USDCDecimal))

      level = await PresaleContract.poolInfo()
      console.log('level', level.presaleLevel)
    })
    it('Check Funder Status', async function () {
      let aliceInfo = await PresaleContract.funders(alice.address)
      console.log('aliceInfo', aliceInfo)
      
      let bobInfo = await PresaleContract.funders(bob.address)
      console.log('bobInfo', bobInfo)

      let quinnInfo = await PresaleContract.funders(quinn.address)
      console.log('quinnInfo', quinnInfo)
    })

    it('Check Funder Reward Amount', async function () {
      let aliceInfo = await PresaleContract.pendingWonka(alice.address)
      console.log('aliceInfo', +aliceInfo)
      let bobInfo = await PresaleContract.pendingWonka(bob.address)
      console.log('bobInfo  ', +bobInfo)
      let quinnInfo = await PresaleContract.pendingWonka(quinn.address)
      console.log('quinnInfo', +quinnInfo)
    })

    it('Check Affliate Amount', async function () {

      let affiliateInfo = await PresaleContract.affiliate(code1)
      console.log(code1 + ":" , +affiliateInfo)
      affiliateInfo = await PresaleContract.affiliate(code2)
      console.log(code2 + ":" , +affiliateInfo)
      
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
