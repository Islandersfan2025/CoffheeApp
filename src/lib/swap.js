import {
  BrowserProvider,
  Contract,
  ZeroAddress,
} from "ethers";

import {
  createReadProvider,
  NETWORKS,
} from "./networks";

/*
 * Only the functions needed by App.js.
 * No write calls are made here.
 * Backend performs pool actions.
 */

const ERC20_ABI = [
  "function symbol() view returns (string)",

  "function decimals() view returns (uint8)",

  "function balanceOf(address) view returns (uint256)",
];

export async function getReadProvider(
  network = NETWORKS.arbitrumSepolia
) {
  return createReadProvider(network);
}

export async function requestSwapWallet(
  network = NETWORKS.arbitrumSepolia
) {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed."
    );
  }

  const provider =
    new BrowserProvider(window.ethereum);

  await provider.send(
    "eth_requestAccounts",
    []
  );

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",

      params: [
        {
          chainId:
            network.chainIdHex,
        },
      ],
    });
  } catch (err) {
    /*
     * Ignore chain add errors.
     * Assume chain already exists.
     */

    if (
      err.code !== 4902 &&
      err.code !== -32603
    ) {
      throw err;
    }
  }

  const signer =
    await provider.getSigner();

  const address =
    await signer.getAddress();

  const currentNetwork =
    await provider.getNetwork();

  return {
    provider,

    signer,

    address,

    chainId: Number(
      currentNetwork.chainId
    ),

    network,
  };
}

export async function fetchSwapState(
  provider,
  walletAddress,
  hookAddress
) {
  const state = {
    connected:
      walletAddress != null,

    wallet:
      walletAddress ||
      ZeroAddress,

    hookAddress,

    balances: [],
  };

  if (!walletAddress) {
    return state;
  }

  /*
   * Example demo tokens.
   * Backend remains source of truth.
   */

  const demoTokens = [
    {
      symbol: "USDC",

      address:
        "0x0000000000000000000000000000000000000001",
    },

    {
      symbol: "WETH",

      address:
        "0x0000000000000000000000000000000000000002",
    },

    {
      symbol: "LINK",

      address:
        "0x0000000000000000000000000000000000000003",
    },
  ];

  for (const token of demoTokens) {
    try {
      const contract =
        new Contract(
          token.address,
          ERC20_ABI,
          provider
        );

      const decimals =
        await contract.decimals();

      const balance =
        await contract.balanceOf(
          walletAddress
        );

      state.balances.push({
        symbol: token.symbol,

        decimals,

        balance:
          balance.toString(),
      });
    } catch {
      /*
       * Ignore unavailable demo tokens.
       */
    }
  }

  return state;
}

export async function getWalletBalance(
  provider,
  address
) {
  const balance =
    await provider.getBalance(
      address
    );

  return balance;
}

export async function currentChain() {
  if (!window.ethereum) {
    return null;
  }

  const provider =
    new BrowserProvider(window.ethereum);

  const network =
    await provider.getNetwork();

  return Number(network.chainId);
}

export async function walletConnected() {
  if (!window.ethereum) {
    return false;
  }

  const accounts =
    await window.ethereum.request({
      method: "eth_accounts",
    });

  return accounts.length > 0;
}

export async function disconnectWallet() {
  /*
   * MetaMask does not expose
   * a disconnect API.
   *
   * App.js simply clears
   * wallet state.
   */

  return true;
}
