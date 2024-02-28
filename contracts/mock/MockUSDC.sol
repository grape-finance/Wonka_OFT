// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor(string memory name, string memory symbol, uint256 supply) ERC20(name, symbol) {
        _mint(msg.sender, supply);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mintTokens(uint256 _amount) external {
        _mint(msg.sender, _amount);
    }
}
