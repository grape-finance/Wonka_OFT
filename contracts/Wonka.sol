// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import { OFTV2 } from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract WonkaOFT is OFTV2, Pausable {
    using SafeMath for uint256;

    /// @notice bridge fee reciever
    address private treasury;

    /// @notice Fee ratio for bridging, in bips
    uint256 public feeRatio;

    /// @notice Divisor for fee ratio, 100%
    uint256 public constant FEE_DIVISOR = 10000;

    /// @notice Emitted when fee ratio is updated
    event FeeUpdated(uint256 fee);

    /// @notice Emitted when Treasury is updated
    event TreasuryUpdated(address indexed treasury);

    /**
     * @notice Create RadiantOFT
     * @param _tokenName token name
     * @param _symbol token symbol
     * @param _endpoint LZ endpoint for network
     * @param _treasury Treasury address, for fee recieve
     * @param _mintAmt Mint amount
     */
    constructor(
        string memory _tokenName,
        string memory _symbol,
        address _endpoint,
        address _treasury,
        uint256 _mintAmt
    ) OFTV2(_tokenName, _symbol, 8, _endpoint) {
        require(_endpoint != address(0), "invalid LZ Endpoint");
        require(_treasury != address(0), "invalid treasury");

        treasury = _treasury;

        if (_mintAmt != 0) {
            _mint(_treasury, _mintAmt);
        }
    }

    function mint(address _to, uint256 _value) external {
        _mint(_to, _value);
    }

    function burn(uint256 _amount) public {
        _burn(_msgSender(), _amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // /**
    //  * @notice Returns LZ fee + Bridge fee
    //  * @dev overrides default OFT estimate fee function to add native fee
    //  * @param _dstChainId dest LZ chain id
    //  * @param _toAddress to addr on dst chain
    //  * @param _amount amount to bridge
    //  * @param _useZro use ZRO token, someday ;)
    //  * @param _adapterParams LZ adapter params
    //  */
    // function estimateSendFee(
    //     uint16 _dstChainId,
    //     bytes32 _toAddress,
    //     uint _amount,
    //     bool _useZro,
    //     bytes calldata _adapterParams
    // ) public view override returns (uint nativeFee, uint zroFee) {
    //     (nativeFee, zroFee) = super.estimateSendFee(_dstChainId, _toAddress, _amount, _useZro, _adapterParams);
    //     nativeFee = nativeFee.add(getBridgeFee(_amount));
    // }

    /**** Internal Functions ****/

    /**
     * @notice Returns LZ fee + Bridge fee
     * @dev overrides default OFT _send function to add native fee
     * @param _from from addr
     * @param _dstChainId dest LZ chain id
     * @param _toAddress to addr on dst chain
     * @param _amount amount to bridge
     * @param _refundAddress refund addr
     * @param _zroPaymentAddress use ZRO token, someday ;)
     * @param _adapterParams LZ adapter params
     */
    function _send(
        address _from,
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint _amount,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal override returns (uint amount) {
        uint256 fee = getBridgeFee(_amount);
        _transfer(_from, treasury, fee);

        _checkAdapterParams(_dstChainId, PT_SEND, _adapterParams, NO_EXTRA_GAS);

        (amount, ) = _removeDust(_amount - fee);
        amount = _debitFrom(_from, _dstChainId, _toAddress, amount); // amount returned should not have dust
        require(amount > 0, "OFTCore: amount too small");

        bytes memory lzPayload = _encodeSendPayload(_toAddress, _ld2sd(amount));
        _lzSend(_dstChainId, lzPayload, _refundAddress, _zroPaymentAddress, _adapterParams, msg.value);

        emit SendToChain(_dstChainId, _from, _toAddress, amount);
    }

    /**
     * @notice overrides default OFT _debitFrom function to make pauseable
     * @param _from from addr
     * @param _dstChainId dest LZ chain id
     * @param _toAddress to addr on dst chain
     * @param _amount amount to bridge
     */
    function _debitFrom(
        address _from,
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint _amount
    ) internal override whenNotPaused returns (uint) {
        return super._debitFrom(_from, _dstChainId, _toAddress, _amount);
    }

    /**
     * @notice Bridge fee amount
     * @param _amount amount for bridge
     */
    function getBridgeFee(uint256 _amount) public view returns (uint256) {
        return _amount.mul(feeRatio).div(FEE_DIVISOR);
    }

    /**** Admin Functions ****/

    /**
     * @notice Set fee info
     * @param _fee ratio
     */
    function setFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1e4, "Invalid ratio");
        feeRatio = _fee;
        emit FeeUpdated(_fee);
    }

    /**
     * @notice Set Treasury
     * @param _treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "invalid Treasury address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
}
