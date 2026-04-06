/* global BigInt */
import { ethers } from "ethers";

export const SWAP_CONFIG = {
  arbSepolia: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    swapAddress: "0xe109c785dD5a143BA65beAffa4Db6c31f40395A8",
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

function getConfig(networkKey = "arbSepolia") {
  const config = SWAP_CONFIG[networkKey];
  if (!config) {
    throw new Error(`Unknown swap network: ${networkKey}`);
  }
  return config;
}

export async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or another EVM wallet.");
  }

  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Read-only provider for contract reads.
 * Uses a fixed RPC so reads do not accidentally follow the wallet's current network.
 */
export async function getReadProvider(networkKey = "arbSepolia") {
  const config = getConfig(networkKey);

  if (!config.rpcUrl) {
    throw new Error(
      "Missing REACT_APP_ARB_SEPOLIA_RPC_URL. Add it to your .env file and restart the app."
    );
  }

  return new ethers.JsonRpcProvider(config.rpcUrl);
}

export async function requestSwapWallet(networkKey = "arbSepolia") {
  const config = getConfig(networkKey);
  const provider = await getBrowserProvider();

  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== config.chainId) {
    throw new Error(
      `Wrong wallet network. Please switch to ${config.name} (${config.chainId}). Current chainId: ${chainId}`
    );
  }

  return {
    provider,
    signer,
    address,
    chainId,
  };
}

export function getSwapContract(providerOrSigner, networkKey = "arbSepolia") {
  const config = getConfig(networkKey);

  if (!ethers.isAddress(config.swapAddress)) {
    throw new Error(`Invalid swap contract address: ${config.swapAddress}`);
  }

  return new ethers.Contract(config.swapAddress, SWAP_ABI, providerOrSigner);
}

export function getConfidentialTokenContract(address, providerOrSigner) {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid token address: ${address}`);
  }

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
  const config = getConfig(networkKey);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("READ PROVIDER CHAIN:", chainId);
  console.log("SWAP ADDRESS:", config.swapAddress);

  if (chainId !== config.chainId) {
    throw new Error(
      `Swap reads must use ${config.name} (${config.chainId}). Current provider chainId: ${chainId}`
    );
  }

  const code = await provider.getCode(config.swapAddress);
  console.log("SWAP CONTRACT CODE:", code);

  if (!code || code === "0x") {
    throw new Error(
      `No contract found at ${config.swapAddress} on ${config.name}.`
    );
  }

  const swap = getSwapContract(provider, networkKey);

  let tokenAAddressFromSwap;
  let tokenBAddressFromSwap;
  let rateAToBNumerator;
  let rateAToBDenominator;
  let rateBToANumerator;
  let rateBToADenominator;

  try {
    [
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
  } catch (err) {
    console.error("Swap contract read failed:", err);
    throw new Error(
      "Contract exists, but tokenA/tokenB/rate reads failed. Check deployment, ABI, and network."
    );
  }

  const tokenAAddress =
    ethers.isAddress(tokenAAddressFromSwap) && tokenAAddressFromSwap !== ethers.ZeroAddress
      ? tokenAAddressFromSwap
      : config.tokenAAddress;

  const tokenBAddress =
    ethers.isAddress(tokenBAddressFromSwap) && tokenBAddressFromSwap !== ethers.ZeroAddress
      ? tokenBAddressFromSwap
      : config.tokenBAddress;

  if (!ethers.isAddress(tokenAAddress) || !ethers.isAddress(tokenBAddress)) {
    throw new Error(
      "Token A / Token B addresses are invalid or missing. Redeploy with real token addresses or set REACT_APP_SWAP_TOKEN_A and REACT_APP_SWAP_TOKEN_B."
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

  if (walletAddress && ethers.isAddress(walletAddress)) {
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
  const config = getConfig(networkKey);

  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }

  const token = getConfidentialTokenContract(tokenAddress, signer);
  const now = Math.floor(Date.now() / 1000);
  const until = now + validForSeconds;

  const tx = await token.setOperator(config.swapAddress, until);
  return tx.wait();
}

/**
 * Temporary encryption hook.
 * Replace this with your real CoFHE browser SDK wiring.
 */
export async function encryptUint64ForSwap(amount) {
  const normalized = BigInt(amount);

  if (window.coffheeEncryptUint64) {
    return await window.coffheeEncryptUint64(normalized);
  }

  if (window.cofhe && typeof window.cofhe.encryptUint64 === "function") {
    return await window.cofhe.encryptUint64(normalized);
  }

  if (window.cofheSdk && typeof window.cofheSdk.encryptUint64 === "function") {
    return await window.cofheSdk.encryptUint64(normalized);
  }

  throw new Error(
    "No browser encryption helper found. Wire your installed @cofhe/sdk encrypt method into encryptUint64ForSwap()."
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
