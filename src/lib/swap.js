import { ethers } from "ethers";

/**
 * CoffheeSwap README publishes the swap contract on Arb Sepolia.
 * The repo does NOT publish real tokenA/tokenB addresses yet,
 * so fill those two values in after you deploy or confirm them.
 */
/* global BigInt */
export const SWAP_CONFIG = {
  arbSepolia: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    swapAddress: "0xd30B60e2b53133899CC10c9f53eb61C05e053CF0",
    rpcUrl: process.env.REACT_APP_ARB_SEPOLIA_RPC_URL || "",
    tokenAAddress: process.env.REACT_APP_SWAP_TOKEN_A || "",
    tokenBAddress: process.env.REACT_APP_SWAP_TOKEN_B || "",
  },
};

export const SWAP_ABI = [
  "function tokenA() view returns (address)",
  "function tokenB() view returns (address)",
  "function rateAToBNumerator() view returns (uint64)",
  "function rateAToBDenominator() view returns (uint64)",
  "function rateBToANumerator() view returns (uint64)",
  "function rateBToADenominator() view returns (uint64)",
  "function swapAForB((bytes32,uint256,uint8,bytes) encryptedAmountIn) external",
  "function swapBForA((bytes32,uint256,uint8,bytes) encryptedAmountIn) external",
  "event SwapAForB(address indexed sender)",
  "event SwapBForA(address indexed sender)",
  "event RatesUpdated(uint64 aToBNumerator, uint64 aToBDenominator, uint64 bToANumerator, uint64 bToADenominator)",
];

export const CONFIDENTIAL_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function setOperator(address operator, uint48 until) external",
  "function isOperator(address holder, address operator) view returns (bool)",
];

/**
 * Returns an EIP-1193 browser provider if a wallet is installed.
 */
export async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or another EVM wallet.");
  }

  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Read-only provider for public reads.
 * Prefers a configured RPC. Falls back to browser provider if available.
 */
export async function getReadProvider(networkKey = "arbSepolia") {
  const config = SWAP_CONFIG[networkKey];

  if (config.rpcUrl) {
    return new ethers.JsonRpcProvider(config.rpcUrl);
  }

  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }

  throw new Error(
    "No read provider available. Set REACT_APP_ARB_SEPOLIA_RPC_URL or open the app in a browser wallet."
  );
}

export async function requestSwapWallet() {
  const provider = await getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

export function getSwapContract(providerOrSigner, networkKey = "arbSepolia") {
  const config = SWAP_CONFIG[networkKey];

  return new ethers.Contract(config.swapAddress, SWAP_ABI, providerOrSigner);
}

export function getConfidentialTokenContract(address, providerOrSigner) {
  return new ethers.Contract(address, CONFIDENTIAL_TOKEN_ABI, providerOrSigner);
}

export function formatRate(numerator, denominator) {
  if (!denominator || denominator === 0n) return "—";
  return Number(numerator) / Number(denominator);
}

export function estimateSwapOutputRaw(amountIn, numerator, denominator) {
  const inAmount = BigInt(amountIn || 0);
  const num = BigInt(numerator || 0);
  const den = BigInt(denominator || 1);
  return (inAmount * num) / den;
}

export async function fetchSwapState(provider, walletAddress = null, networkKey = "arbSepolia") {
  const config = SWAP_CONFIG[networkKey];
  const swap = getSwapContract(provider, networkKey);

  const [
    tokenAAddressFromSwap,
    tokenBAddressFromSwap,
    rateAToBNumerator,
    rateAToBDenominator,
    rateBToANumerator,
    rateBToADenominator,
  ] = await Promise.all([
    swap.tokenA(),
    swap.tokenB(),
    swap.rateAToBNumerator(),
    swap.rateAToBDenominator(),
    swap.rateBToANumerator(),
    swap.rateBToADenominator(),
  ]);

  const tokenAAddress =
    tokenAAddressFromSwap && tokenAAddressFromSwap !== ethers.ZeroAddress
      ? tokenAAddressFromSwap
      : config.tokenAAddress;

  const tokenBAddress =
    tokenBAddressFromSwap && tokenBAddressFromSwap !== ethers.ZeroAddress
      ? tokenBAddressFromSwap
      : config.tokenBAddress;

  if (!tokenAAddress || !tokenBAddress) {
    throw new Error(
      "Token A / Token B addresses are missing. Fill REACT_APP_SWAP_TOKEN_A and REACT_APP_SWAP_TOKEN_B if the contract read does not return them."
    );
  }

  const tokenA = getConfidentialTokenContract(tokenAAddress, provider);
  const tokenB = getConfidentialTokenContract(tokenBAddress, provider);

  const [tokenAName, tokenASymbol, tokenADecimals, tokenBName, tokenBSymbol, tokenBDecimals] =
    await Promise.all([
      safeReadString(() => tokenA.name(), "Token A"),
      safeReadString(() => tokenA.symbol(), "TKNA"),
      safeReadNumber(() => tokenA.decimals(), 18),
      safeReadString(() => tokenB.name(), "Token B"),
      safeReadString(() => tokenB.symbol(), "TKNB"),
      safeReadNumber(() => tokenB.decimals(), 18),
    ]);

  let tokenAApproved = false;
  let tokenBApproved = false;

  if (walletAddress) {
    [tokenAApproved, tokenBApproved] = await Promise.all([
      safeReadBool(() => tokenA.isOperator(walletAddress, config.swapAddress), false),
      safeReadBool(() => tokenB.isOperator(walletAddress, config.swapAddress), false),
    ]);
  }

  return {
    swapAddress: config.swapAddress,
    tokenA: {
      address: tokenAAddress,
      name: tokenAName,
      symbol: tokenASymbol,
      decimals: tokenADecimals,
      approved: tokenAApproved,
    },
    tokenB: {
      address: tokenBAddress,
      name: tokenBName,
      symbol: tokenBSymbol,
      decimals: tokenBDecimals,
      approved: tokenBApproved,
    },
    rates: {
      aToB: {
        numerator: BigInt(rateAToBNumerator),
        denominator: BigInt(rateAToBDenominator),
        display: formatRate(BigInt(rateAToBNumerator), BigInt(rateAToBDenominator)),
      },
      bToA: {
        numerator: BigInt(rateBToANumerator),
        denominator: BigInt(rateBToADenominator),
        display: formatRate(BigInt(rateBToANumerator), BigInt(rateBToADenominator)),
      },
    },
  };
}

export async function approveSwapOperator({
  signer,
  tokenAddress,
  networkKey = "arbSepolia",
  validForSeconds = 60 * 60 * 24 * 365,
}) {
  const config = SWAP_CONFIG[networkKey];
  const token = getConfidentialTokenContract(tokenAddress, signer);

  const now = Math.floor(Date.now() / 1000);
  const until = now + validForSeconds;

  const tx = await token.setOperator(config.swapAddress, until);
  return tx.wait();
}

/**
 * IMPORTANT:
 * The contract expects an SDK-produced InEuint64 payload.
 * Because the repo does not include the exact browser helper wiring,
 * this function intentionally isolates that step so you only need to edit one place.
 */
export async function encryptUint64ForSwap(amount) {
  const normalized = BigInt(amount);

  // Option 1: your app injects a helper
  if (window.coffheeEncryptUint64) {
    return await window.coffheeEncryptUint64(normalized);
  }

  // Option 2: you attach a helper after initializing @cofhe/sdk
  if (window.cofhe && typeof window.cofhe.encryptUint64 === "function") {
    return await window.cofhe.encryptUint64(normalized);
  }

  if (window.cofheSdk && typeof window.cofheSdk.encryptUint64 === "function") {
    return await window.cofheSdk.encryptUint64(normalized);
  }

  throw new Error(
    "No browser encryption helper found. Wire your installed @cofhe/sdk encrypt method into encryptUint64ForSwap() in src/lib/swap.js."
  );
}

export async function swapTokenAForB({
  signer,
  amountRaw,
  networkKey = "arbSepolia",
}) {
  const swap = getSwapContract(signer, networkKey);
  const encryptedAmountIn = await encryptUint64ForSwap(amountRaw);

  const tx = await swap.swapAForB(encryptedAmountIn);
  return tx.wait();
}

export async function swapTokenBForA({
  signer,
  amountRaw,
  networkKey = "arbSepolia",
}) {
  const swap = getSwapContract(signer, networkKey);
  const encryptedAmountIn = await encryptUint64ForSwap(amountRaw);

  const tx = await swap.swapBForA(encryptedAmountIn);
  return tx.wait();
}

export function parseUnitsSafe(value, decimals) {
  if (!value || Number(value) <= 0) return 0n;
  return ethers.parseUnits(String(value), decimals);
}

export function formatUnitsSafe(value, decimals, precision = 6) {
  const formatted = ethers.formatUnits(value, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  if (!fraction) return formatted;
  return `${whole}.${fraction.slice(0, precision)}`;
}

async function safeReadString(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function safeReadNumber(fn, fallback) {
  try {
    return Number(await fn());
  } catch {
    return fallback;
  }
}

async function safeReadBool(fn, fallback) {
  try {
    return Boolean(await fn());
  } catch {
    return fallback;
  }
}