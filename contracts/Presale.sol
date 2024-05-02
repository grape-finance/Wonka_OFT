// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract Presale is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    enum PresaleStatus {
        Started,
        Finished
    }

    struct PresaleConfig {
        address usdc;
        address presaleToken;
        uint256 startTime;
        uint256 endTime;
        uint256 softcap;
        uint256 hardcap;
        uint256 minContribution;
        uint256 maxContribution;
    }

    struct PoolInfo {
        uint presaleLevel;
        uint256 lastRewardBlock; // Last block number that Wonka distribution occurs.
        uint256 accWonkaPerShare; // Accumulated Wonka per share
    }

    struct Funder {
        uint256 contributedAmount;
        uint256 claimableAmount;
        uint256 rewardAmount;
        uint256 rewardDebt;
        bool isClaimed;
    }

    // Presale Info Variables
    uint256 public constant PRECISION_FACTOR = uint256(10 ** (40 - 18));
    bool public initialized = false;
    PresaleConfig public presaleConfig;
    PresaleStatus public presaleStatus;
    // Presale Level will rise up once 1 week passed or capLevel reached.
    uint256[] public wonkaPrice;
    uint256[] public capPerLevel;

    uint256 public totalContributed;
    uint256[7] public contributedPerLevel;

    // Reward Distribution Variables
    PoolInfo public poolInfo;
    uint256 public wonkaPerBlock;

    // User Info Variables
    mapping(address => Funder) public funders;
    uint256 public funderCounter;

    // Affiliate Variable
    mapping(string => uint256) public affiliate;

    event Contribute(address funder, uint256 amount);
    event Claimed(address funder, uint256 amount);

    constructor() {}

    function initialize(
        PresaleConfig memory _config,
        uint256[] memory _price,
        uint256[] memory _capPerLevel,
        uint256 _wonkaPerBlock
    ) external onlyOwner {
        require(!initialized, "already initialized");
        require(owner() == address(0x0) || _msgSender() == owner(), "not allowed");

        initialized = true;
        presaleConfig = _config;
        wonkaPrice = _price;
        capPerLevel = _capPerLevel;
        poolInfo.lastRewardBlock = block.number;
        wonkaPerBlock = _wonkaPerBlock;
    }

    /**** Presale Functions ****/

    function contribute(uint256 _amount, string calldata code) external nonReentrant {
        require(presaleStatus == PresaleStatus.Started, "Presale is over");

        require(_amount >= presaleConfig.minContribution, "Contribution Amount is too low");
        // require(_amount <= presaleConfig.max_contribution, "Amount is high");
        require(block.timestamp > presaleConfig.startTime, "Presale is not started yet");
        require(block.timestamp < presaleConfig.endTime, "Presale is over");
        require(totalContributed <= presaleConfig.hardcap, "Hard cap was reached");

        Funder storage funder = funders[_msgSender()];

        require(funder.contributedAmount + _amount <= presaleConfig.maxContribution, "Contribution amount is too high");
        if (funder.contributedAmount == 0) {
            funderCounter++;
        }

        updatePool();

        if (funder.contributedAmount > 0) {
            uint256 pending = funder.contributedAmount.mul(poolInfo.accWonkaPerShare).div(PRECISION_FACTOR).sub(
                funder.rewardDebt
            );
            funder.rewardAmount += pending;
        }

        IERC20(presaleConfig.usdc).transferFrom(msg.sender, address(this), _amount);

        totalContributed += _amount;
        contributedPerLevel[poolInfo.presaleLevel] += _amount;

        funder.contributedAmount = funder.contributedAmount + _amount;
        funder.claimableAmount = funder.claimableAmount + _amount * wonkaPrice[poolInfo.presaleLevel];
        funder.rewardDebt = funder.contributedAmount.mul(poolInfo.accWonkaPerShare).div(PRECISION_FACTOR);

        affiliate[code] += _amount * wonkaPrice[poolInfo.presaleLevel];

        if (totalContributed >= presaleConfig.hardcap) presaleStatus = PresaleStatus.Finished;
        updatePresaleLevel();

        emit Contribute(_msgSender(), _amount);
    }

    function claim() external nonReentrant {
        require(presaleStatus == PresaleStatus.Finished , "Presale is not finished");

        Funder storage funder = funders[_msgSender()];
        require(funder.contributedAmount >= presaleConfig.minContribution && funder.isClaimed == false, "You are not a funder");

        updatePool();

        funder.isClaimed = true;

        uint256 pending = funder.contributedAmount.mul(poolInfo.accWonkaPerShare).div(PRECISION_FACTOR).sub(
            funder.rewardDebt
        );
        funder.rewardAmount += pending;

        _safeTransfer(IERC20(presaleConfig.presaleToken), _msgSender(), funder.claimableAmount + funder.rewardAmount);
        emit Claimed(_msgSender(), funder.claimableAmount + funder.rewardAmount);
    }

    function updatePresaleLevel() public {
        if (
            contributedPerLevel[poolInfo.presaleLevel] >= capPerLevel[poolInfo.presaleLevel] ||
            block.timestamp >= presaleConfig.startTime + (poolInfo.presaleLevel + 1) * 24 * 60 * 60
        ) {
            // In case contributed amount per level is reached cap amount , Or level period is passed
            poolInfo.presaleLevel++;
        }
    }

    // function updatePresaleLevel(IERC20 _token, address _to, uint256 _amount) public onlyOwner {
    //     _token.safeTransfer(_to, _amount);
    // }

    //**** Reward Distribution functions ****/

    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return _to.sub(_from);
    }

    function pendingWonka(address _user) external view returns (uint256) {
        Funder storage user = funders[_user];
        uint256 accWonkaPerShare = poolInfo.accWonkaPerShare;
        if (block.number > poolInfo.lastRewardBlock && totalContributed != 0 && poolInfo.lastRewardBlock > 0) {
            uint256 multiplier = getMultiplier(poolInfo.lastRewardBlock, block.number);
            uint256 wonkaReward = multiplier.mul(wonkaPerBlock);

            accWonkaPerShare = accWonkaPerShare.add(wonkaReward.mul(PRECISION_FACTOR).div(totalContributed));
        }
        return user.contributedAmount.mul(accWonkaPerShare).div(PRECISION_FACTOR).sub(user.rewardDebt);
    }

    function updatePool() public {
        if (block.number <= poolInfo.lastRewardBlock || poolInfo.lastRewardBlock == 0) return;
        if (totalContributed == 0) {
            poolInfo.lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getMultiplier(poolInfo.lastRewardBlock, block.number);
        uint256 _reward = multiplier * wonkaPerBlock;
        poolInfo.accWonkaPerShare += (_reward * PRECISION_FACTOR) / totalContributed;

        poolInfo.lastRewardBlock = block.number;
    }

    //**** Internal Functions ****/
    function _safeTransfer(IERC20 _token, address _to, uint256 _amount) internal {
        _token.safeTransfer(_to, _amount);
    }
    //**** Admin Function ****/
    function setPresaleStatus(PresaleStatus _status) public onlyOwner {
        presaleStatus = _status;
    }

    function adminClaim(IERC20 _token, address _to, uint256 _amount) public onlyOwner {
        _token.safeTransfer(_to, _amount);
    }

    receive() external payable {
        (bool success, ) = owner().call{ value: msg.value }(new bytes(0));
        require(success, "ETH transfer failed");
    }
}
