// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import { TokenTimelock } from './TokenTimelock.sol';

contract Presale is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct PresaleConfig {
        address token;
        uint256 price;
        uint256 hardcap;
        uint256 softcap;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 startTime;
        uint256 endTime;
    }
    enum PresaleStatus {
        Started,
        Finished
    }
    enum FunderStatus {
        None,
        Invested,
        Claimed
    }
    struct Funder {
        uint256 contributedAmount;
        uint256 claimableAmount;
        FunderStatus status;
    }

    address public usdc = 0x0B3924aBe2A9856e9b685c7788d15fFD465C3Dd4;

    bool public initialized = false;

    PresaleConfig public presaleConfig;
    PresaleStatus public presaleStatus;
    
    uint256 public totalContributed;

    mapping(address => Funder) public funders;
    uint256 public funderCounter;

    address public treasury;

    event Contribute(address funder, uint256 amount);
    event Claimed(address funder, uint256 amount);

    constructor() {}

    function initialize(PresaleConfig memory _config, address _treasury) external onlyOwner(){
        require(!initialized, 'already initialized');
        require(owner() == address(0x0) || _msgSender() == owner(), 'not allowed');

        initialized = true;

        presaleConfig = _config;

        treasury = _treasury;
    }

    function contribute(uint256 _amount) external nonReentrant {
        require(presaleStatus == PresaleStatus.Started, 'TokenSale: Presale is over!');

        require(_amount >= presaleConfig.minContribution, 'Contribution Amount is too low');
        // require(_amount <= presaleConfig.max_contribution, 'Amount is high');
        require(block.timestamp > presaleConfig.startTime, 'Presale is not started yet');
        require(block.timestamp < presaleConfig.endTime, 'Presale is over');
        require(totalContributed <= presaleConfig.hardcap, 'Hard cap was reached');

        Funder storage funder = funders[_msgSender()];
        require(funder.contributedAmount + _amount <= presaleConfig.maxContribution, 'Contribution amount is too high');
        if (funder.contributedAmount == 0 && funder.status == FunderStatus.None) {
            funderCounter++;
        }

        // TODO
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);

        // presaleConfig.price =
        totalContributed += _amount;

        funder.contributedAmount = funder.contributedAmount + _amount;
        funder.claimableAmount = funder.claimableAmount + _amount * presaleConfig.price;
        funder.status = FunderStatus.Invested;

        if (totalContributed >= presaleConfig.hardcap) presaleStatus = PresaleStatus.Finished;

        emit Contribute(_msgSender(), _amount);
    }

    function claim() external nonReentrant {
        require(presaleStatus == PresaleStatus.Finished, 'Presale is not finished');

        Funder storage funder = funders[_msgSender()];

        require(
            funder.contributedAmount > presaleConfig.minContribution && funder.status == FunderStatus.Invested,
            'You are not a funder'
        );

        // TODO

        funder.status = FunderStatus.Claimed;
        _safeTransfer(IERC20(presaleConfig.token), _msgSender(), funder.claimableAmount);
        emit Claimed(_msgSender(), funder.claimableAmount);
    }



    receive() external payable {
        _safeTransferETH(treasury, msg.value);
    }

    //**** Internal Functions ****/
    function _safeTransferETH(address _to, uint256 _value) internal {
        (bool success, ) = _to.call{ value: _value }(new bytes(0));
        require(success, 'TransferHelper: BNB_TRANSFER_FAILED');
    }

    function _safeTransfer(IERC20 _token, address _to, uint256 _amount) internal {
        _token.safeTransfer(_to, _amount);
    }
    //**** Admin Function ****/
    function setPresaleStatus(PresaleStatus _status) public onlyOwner() {
        presaleStatus = _status;
    }
    function adminClaim(IERC20 _token, address _to, uint256 _amount) public onlyOwner {
        _token.safeTransfer(_to, _amount);
    }
}
