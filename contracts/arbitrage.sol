// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IUniswapV2Router02
 * @dev Interface for the Uniswap V2 Router.
 */

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

/**
 * @title IPool
 * @dev Aave V3 Pool interface for flash loans.
 */
interface IPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/**
 * @title Arbitrage
 * @author adegbalajoshua
 * @notice This contract executes a DEX arbitrage trade using a flash loan from Aave V3.
 * It is designed to be called by a trusted off-chain bot.
 */
contract Arbitrage is Ownable {
    using SafeERC20 for IERC20;

    address public constant AAVE_POOL =
        0x6Ae43d3271ff6888e7Fc43Fd737F57823652Ac87; // Aave V3 Pool on Sepolia
    address public immutable weth;

    /**
     * @dev Thrown when the arbitrage execution does not yield a profit.
     */
    error InsufficientProfit();

    /**
     * @param _wethAddress The address of the Wrapped Ether (WETH) token.
     */
    constructor(address _wethAddress) Ownable(msg.sender) {
        weth = _wethAddress;
    }

    /**
     * @notice Initiates an arbitrage trade.
     * @dev This function requests a flash loan and passes swap parameters to the Aave callback.
     * Only the owner (the bot) can call this function.
     * @param flashLoanToken The token to borrow from Aave (e.g., WETH).
     * @param flashLoanAmount The amount of the token to borrow.
     * @param dexRouterA The address of the first DEX router.
     * @param dexRouterB The address of the second DEX router.
     * @param tradeToken The token to trade against the flash loan token (e.g., DAI).
     */
    function executeArbitrage(
        address flashLoanToken,
        uint256 flashLoanAmount,
        address dexRouterA,
        address dexRouterB,
        address tradeToken
    ) external onlyOwner {
        address[] memory assets = new address[](1);
        assets[0] = flashLoanToken;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = flashLoanAmount;

        // There is no interest on flash loans. A premium is paid instead.
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // 0 = No debt, 1 = Stable, 2 = Variable

        // Encode the parameters to be used in the callback
        bytes memory params = abi.encode(dexRouterA, dexRouterB, tradeToken);

        IPool(AAVE_POOL).flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    /**
     * @notice This is the callback function that Aave Pool will call.
     * @dev It executes the arbitrage logic: swap, swap back, check profit, and repay loan.
     * @param assets The array of token addresses borrowed.
     * @param amounts The array of amounts borrowed.
     * @param premiums The array of fee amounts to be paid back.
     * @param params The encoded data passed from the initial `executeArbitrage` call.
     * @return A keccak256 hash of "ERC3156FlashBorrower.onFlashLoan" to confirm successful execution.
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address, // initiator
        bytes calldata params
    ) external returns (bool) {
        // Ensure the caller is the Aave V3 Pool
        require(msg.sender == AAVE_POOL, "Caller is not Aave Pool");

        // Decode parameters
        (address dexRouterA, address dexRouterB, address tradeToken) = abi
            .decode(params, (address, address, address));

        address flashLoanToken = assets[0];
        uint256 flashLoanAmount = amounts[0];
        uint256 premium = premiums[0];

        // 1. First Swap (e.g., WETH -> DAI on Uniswap)
        // Approve the first router to spend the borrowed tokens
        IERC20(flashLoanToken).safeApprove(dexRouterA, flashLoanAmount);

        address[] memory path1 = new address[](2);
        path1[0] = flashLoanToken;
        path1[1] = tradeToken;

        IUniswapV2Router02(dexRouterA).swapExactTokensForTokens(
            flashLoanAmount,
            0, // amountOutMin = 0 for simplicity in this PoC
            path1,
            address(this),
            block.timestamp
        );

        // 2. Second Swap (e.g., DAI -> WETH on Sushiswap)
        uint256 tradeTokenBalance = IERC20(tradeToken).balanceOf(address(this));
        IERC20(tradeToken).safeApprove(dexRouterB, tradeTokenBalance);

        address[] memory path2 = new address[](2);
        path2[0] = tradeToken;
        path2[1] = flashLoanToken;

        IUniswapV2Router02(dexRouterB).swapExactTokensForTokens(
            tradeTokenBalance,
            0,
            path2,
            address(this),
            block.timestamp
        );

        // 3. Profitability Check & Repayment
        uint256 finalBalance = IERC20(flashLoanToken).balanceOf(address(this));
        uint256 amountToRepay = flashLoanAmount + premium;

        if (finalBalance <= amountToRepay) {
            revert InsufficientProfit();
        }

        // Approve Aave Pool to pull the repayment amount
        IERC20(flashLoanToken).safeApprove(AAVE_POOL, amountToRepay);

        return true;
    }

    /**
     * @notice Withdraws accumulated profits from the contract.
     * @dev Can only be called by the owner.
     * @param tokenAddress The address of the token to withdraw.
     */
    function withdraw(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        token.safeTransfer(owner(), balance);
    }

    /**
     * @notice Fallback function to receive ETH.
     */
    receive() external payable {}
}
