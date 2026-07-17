import { JsonRpcProvider } from "ethers";

export const NETWORKS = {
  arbitrumSepolia: {
    key: "arbitrumSepolia",

    name: "Arbitrum Sepolia",

    chainId: 421614,

    chainIdHex: "0x66eee",

    rpcUrl:
      process.env.REACT_APP_ARB_SEPOLIA_RPC_URL ||
      "https://sepolia-rollup.arbitrum.io/rpc",

    explorer:
      "https://sepolia.arbiscan.io",

    hookAddress:
      "0xC4Dd117e53f9624ED2EE02e6c8CD662645F6e56A",

    privacyProvider: "Fhenix",

    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },

  ethereumSepolia: {
    key: "ethereumSepolia",

    name: "Ethereum Sepolia",

    chainId: 11155111,

    chainIdHex: "0xaa36a7",

    rpcUrl:
      process.env.REACT_APP_ETH_SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com",

    explorer:
      "https://sepolia.etherscan.io",

    hookAddress:
      "0x9F4524f7Ea61f368BB731033dC47f78aC6c22dEc",

    privacyProvider: "Zama",

    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

export function getNetwork(key) {
  return NETWORKS[key] || NETWORKS.arbitrumSepolia;
}

export function createReadProvider(network) {
  return new JsonRpcProvider(network.rpcUrl);
}

export function explorerTx(network, hash) {
  return `${network.explorer}/tx/${hash}`;
}

export function explorerAddress(network, address) {
  return `${network.explorer}/address/${address}`;
}