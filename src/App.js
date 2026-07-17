import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  fetchSwapState,
  requestSwapWallet,
  getReadProvider,
} from "./lib/swap";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:3001";

const NETWORKS = {
  arbitrumSepolia: {
    key: "arbitrumSepolia",
    name: "Arbitrum Sepolia",
    shortName: "Arb Sepolia",
    chainId: 421614,
    chainIdHex: "0x66eee",
    rpcUrl:
      process.env.REACT_APP_ARB_SEPOLIA_RPC_URL ||
      "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    hookAddress:
      "0xC4Dd117e53f9624ED2EE02e6c8CD662645F6e56A",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },

  ethereumSepolia: {
    key: "ethereumSepolia",
    name: "Ethereum Sepolia",
    shortName: "ETH Sepolia",
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    rpcUrl:
      process.env.REACT_APP_ETH_SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    hookAddress:
      "0x9F4524f7Ea61f368BB731033dC47f78aC6c22dEc",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

const tabs = ["Trade", "Markets", "eAssets"];

// Structured position states matching the multi-asset Plan schema.
const initialPositions = [
  {
    assetIndex: 0,
    pair: "eETH / eUSD",
    ticker: "cETH",
    tokenAddress:
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    exposure: "4,120 BPS",
    target: "5,000 BPS",
    drift: "880 BPS",
    lastDelta: "124 BPS",
    status: "Active Tracking",
    poolType: "Confidential Vault",
  },
  {
    assetIndex: 1,
    pair: "eFRAP / eUSD",
    ticker: "cFRAP",
    tokenAddress:
      "0x111111111117dc0aa78b770fa6a738034120c302",
    exposure: "2,450 BPS",
    target: "2,500 BPS",
    drift: "50 BPS",
    lastDelta: "12 BPS",
    status: "Balanced Delta",
    poolType: "Debt Instrument",
  },
  {
    assetIndex: 2,
    pair: "eBTC / eUSD",
    ticker: "cWBTC",
    tokenAddress:
      "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    exposure: "1,890 BPS",
    target: "2,500 BPS",
    drift: "610 BPS",
    lastDelta: "95 BPS",
    status: "Evaluating Drift",
    poolType: "Encrypted Yield Pool",
  },
];

const mockPools = initialPositions.map((position) => ({
  id: `POOL-${position.assetIndex}`,
  ...position,
}));

const structuredPools = [
  {
    id: "DDM-001",
    name: "Espresso Perp Carry Pool",
    type: "Dark Derivatives",
    maturity: "Open",
    apr: "14.80%",
    price: "$1.00",
    supply: "2,400",
    collateral: "eUSD",
    risk: "Medium",
    description:
      "A private pool for tokenized perp positions with eUSD collateral reserves.",
  },
  {
    id: "DCP-001",
    name: "Mocha Credit Pool",
    type: "Dark Credit",
    maturity: "180 Days",
    apr: "10.25%",
    price: "$96.20",
    supply: "1,150",
    collateral: "eUSD",
    risk: "Low-Medium",
    description:
      "A private credit pool for debt exposure, reserves, and yield.",
  },
  {
    id: "DDM-002",
    name: "Black Roast Hedge Pool",
    type: "Dark Derivatives",
    maturity: "30 Days",
    apr: "18.40%",
    price: "$1.00",
    supply: "760",
    collateral: "eUSD",
    risk: "High",
    description:
      "Strategy pool for tokenized perp positions and derivatives.",
  },
];

function getEAssetRoutes(network) {
  const destination = network.name;

  return [
    {
      symbol: "eUSD",
      name: "Encrypted USD",
      sourceChain:
        network.key === "arbitrumSepolia"
          ? "Arbitrum Sepolia"
          : "Ethereum Sepolia",
      destinationChain: destination,
      route: `${network.key}-stablecoin-to-eUSD`,
      acceptedCollateral: ["USD.e", "USDC", "USDT"],
      defaultCollateral: "USDC",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eBTC",
      name: "Encrypted Bitcoin",
      sourceChain:
        network.key === "arbitrumSepolia"
          ? "Ethereum Sepolia"
          : "Ethereum Sepolia",
      destinationChain: destination,
      route: `${network.key}-tBTC-to-eBTC`,
      acceptedCollateral: ["tBTC"],
      defaultCollateral: "tBTC",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eETH",
      name: "Encrypted Ether",
      sourceChain: "Ethereum Sepolia",
      destinationChain: destination,
      route: `${network.key}-WETH-to-eETH`,
      acceptedCollateral: ["WETH"],
      defaultCollateral: "WETH",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eLINK",
      name: "Encrypted LINK",
      sourceChain: "Ethereum Sepolia",
      destinationChain: destination,
      route: `${network.key}-LINK-to-eLINK`,
      acceptedCollateral: ["LINK"],
      defaultCollateral: "LINK",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eHYPE",
      name: "Encrypted HYPE",
      sourceChain: "Ethereum Sepolia",
      destinationChain: destination,
      route: `${network.key}-HYPE-to-eHYPE`,
      acceptedCollateral: ["HYPE"],
      defaultCollateral: "HYPE",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eTSLA",
      name: "Encrypted Tesla bStock",
      sourceChain: "BNB Chain Testnet",
      destinationChain: destination,
      route: `${network.key}-bTSLA-to-eTSLA`,
      acceptedCollateral: ["bTSLA"],
      defaultCollateral: "bTSLA",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eNVDA",
      name: "Encrypted Nvidia bStock",
      sourceChain: "BNB Chain Testnet",
      destinationChain: destination,
      route: `${network.key}-bNVDA-to-eNVDA`,
      acceptedCollateral: ["bNVDA"],
      defaultCollateral: "bNVDA",
      backendEndpoint: "/api/mint-easset",
    },
    {
      symbol: "eAAPL",
      name: "Encrypted Apple bStock",
      sourceChain: "BNB Chain Testnet",
      destinationChain: destination,
      route: `${network.key}-bAAPL-to-eAAPL`,
      acceptedCollateral: ["bAAPL"],
      defaultCollateral: "bAAPL",
      backendEndpoint: "/api/mint-easset",
    },
  ];
}

function CoffheeLogoSvg({ className }) {
  return (
    <svg
      viewBox="0 0 350 450"
      className={className}
      style={{
        width: "32px",
        height: "32px",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 60 120 L 80 410 C 80 425, 95 435, 110 435 L 240 435 C 255 435, 270 425, 270 410 L 290 120 Z"
        fill="none"
        stroke="#a3e635"
        strokeWidth="18"
        strokeLinejoin="round"
      />

      <path
        d="M 40 100 L 310 100"
        stroke="#a3e635"
        strokeWidth="20"
        strokeLinecap="round"
      />

      <path
        d="M 70 100 L 85 45 C 85 35, 95 25, 110 25 L 240 25 C 255 25, 265 35, 265 45 L 280 100"
        fill="none"
        stroke="#a3e635"
        strokeWidth="16"
        strokeLinejoin="round"
      />

      <path
        d="M 54 150 L 296 150"
        stroke="#a3e635"
        strokeWidth="16"
      />

      <path
        d="M 68 340 L 282 340"
        stroke="#a3e635"
        strokeWidth="16"
      />

      <path
        d="M 60 220 L 290 220"
        stroke="#a3e635"
        strokeWidth="12"
      />

      <path
        d="M 64 280 L 286 280"
        stroke="#a3e635"
        strokeWidth="12"
      />

      <circle
        cx="175"
        cy="250"
        r="42"
        fill="#111"
        stroke="#a3e635"
        strokeWidth="14"
      />

      <circle
        cx="175"
        cy="250"
        r="10"
        fill="#a3e635"
      />
    </svg>
  );
}

function App() {
  const [activeTab, setActiveTab] =
    useState("Trade");

  const [
    selectedNetworkKey,
    setSelectedNetworkKey,
  ] = useState("arbitrumSepolia");

  const [wallet, setWallet] =
    useState(null);

  const [hookLoading, setHookLoading] =
    useState(false);

  const [hookMessage, setHookMessage] =
    useState("");

  const [hookError, setHookError] =
    useState("");

  const selectedNetwork =
    NETWORKS[selectedNetworkKey];

  const schrodingerHookAddress =
    selectedNetwork.hookAddress;

  const eAssetRoutes = useMemo(
    () => getEAssetRoutes(selectedNetwork),
    [selectedNetwork]
  );

  // Enter Pool state
  const [selectedPool, setSelectedPool] =
    useState(mockPools[2]);

  const [
    poolDepositToken,
    setPoolDepositToken,
  ] = useState("eUSD");

  const [
    poolDepositAmount,
    setPoolDepositAmount,
  ] = useState("");

  const [
    joinPoolMessage,
    setJoinPoolMessage,
  ] = useState("");

  // Existing plan values remain available to the backend.
  const [rebalanceThreshold] =
    useState("150");

  const [volatilityBps] =
    useState("400");

  const [
    isPlanActive,
    setIsPlanActive,
  ] = useState(true);

  // Decryption and permissions
  const [
    targetEntityAddress,
    setTargetEntityAddress,
  ] = useState("");

  const [
    decryptOutput,
    setDecryptOutput,
  ] = useState("");

  const [
    isDecrypting,
    setIsDecrypting,
  ] = useState(false);

  const [
    viewerAddress,
    setViewerAddress,
  ] = useState("");

  // eAssets
  const [
    selectedEAssetSymbol,
    setSelectedEAssetSymbol,
  ] = useState("eUSD");

  const [
    eAssetSourceToken,
    setEAssetSourceToken,
  ] = useState("USDC");

  const [
    eAssetDepositAmount,
    setEAssetDepositAmount,
  ] = useState("");

  const [
    eAssetLockPeriod,
    setEAssetLockPeriod,
  ] = useState("30 Days");

  const [
    eAssetMintMessage,
    setEAssetMintMessage,
  ] = useState("");

  // Structured markets
  const [
    selectedStructuredPool,
    setSelectedStructuredPool,
  ] = useState(structuredPools[0]);

  const [
    structuredDepositAmount,
    setStructuredDepositAmount,
  ] = useState("1");

  const [
    structuredActionMessage,
    setStructuredActionMessage,
  ] = useState("");

  const selectedEAsset =
    eAssetRoutes.find(
      (asset) =>
        asset.symbol ===
        selectedEAssetSymbol
    ) || eAssetRoutes[0];

  const pageTitle =
    activeTab === "Trade"
      ? "Dark Roast Pools"
      : activeTab === "Markets"
        ? "Shielded Marketplace"
        : "eAssets";

  const pageDesc =
    activeTab === "Trade"
      ? "The Schrödinger Hook is an automated portfolio manager that continuously monitors and rebalances assets without revealing the underlying strategy to the market."
      : activeTab === "Markets"
        ? "Browse Coffhee's shielded asset markets backed by structured derivative and credit positions."
        : "Lock supported assets and mint encrypted Coffhee assets for private trading across dark pools.";

  const createNetworkPayload = () => ({
    network: selectedNetwork.key,
    networkName: selectedNetwork.name,
    chainId: selectedNetwork.chainId,
    hookAddress:
      schrodingerHookAddress,
    privacyProvider:
      selectedNetwork.privacyProvider,
  });

  useEffect(() => {
    setWallet(null);
    setHookMessage(
      `Network selected: ${selectedNetwork.name} / ${selectedNetwork.privacyProvider}`
    );
    setHookError("");
    setJoinPoolMessage("");
    setDecryptOutput("");
    setEAssetMintMessage("");
    setStructuredActionMessage("");
  }, [selectedNetwork]);

  useEffect(() => {
    if (activeTab !== "Trade") {
      return undefined;
    }

    let cancelled = false;

    async function loadHookContext() {
      try {
        setHookLoading(true);
        setHookError("");

        const provider =
          wallet?.provider ||
          (await getReadProvider(
            selectedNetwork
          ));

        await fetchSwapState(
          provider,
          wallet?.address,
          schrodingerHookAddress
        );
      } catch (error) {
        if (!cancelled) {
          setHookError(
            error?.message ||
              "Node communications reporting uninitialized plan metadata."
          );
        }
      } finally {
        if (!cancelled) {
          setHookLoading(false);
        }
      }
    }

    loadHookContext();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    wallet,
    selectedNetwork,
    schrodingerHookAddress,
  ]);

  const parseApiResponse = async (
    response
  ) => {
    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      return response.json();
    }

    const text = await response.text();

    return {
      message: text,
    };
  };

  const postToApi = async (
    endpoint,
    payload
  ) => {
    const response = await fetch(
      `${API_BASE}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          ...createNetworkPayload(),
          ...payload,
        }),
      }
    );

    const data =
      await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Request failed with status ${response.status}.`
      );
    }

    return data;
  };

  const handleNetworkChange = async (
    event
  ) => {
    const nextKey = event.target.value;
    const nextNetwork =
      NETWORKS[nextKey];

    setSelectedNetworkKey(nextKey);
    setWallet(null);

    if (!window.ethereum) {
      return;
    }

    try {
      await window.ethereum.request({
        method:
          "wallet_switchEthereumChain",
        params: [
          {
            chainId:
              nextNetwork.chainIdHex,
          },
        ],
      });
    } catch (error) {
      if (
        error?.code !== 4902 &&
        error?.code !== -32603
      ) {
        setHookError(
          error?.message ||
            `Unable to switch to ${nextNetwork.name}.`
        );
      }
    }
  };

  const handleConnectWallet =
    async () => {
      try {
        setHookError("");
        setHookMessage("");

        const connected =
          await requestSwapWallet(
            selectedNetwork
          );

        setWallet(connected);

        setHookMessage(
          `Node Authorized: ${connected.address.slice(
            0,
            6
          )}...${connected.address.slice(
            -4
          )} on ${selectedNetwork.name}`
        );
      } catch (error) {
        if (
          error?.code === 4001 ||
          error?.code ===
            "ACTION_REJECTED" ||
          error?.message
            ?.toLowerCase()
            .includes("user rejected")
        ) {
          setHookError(
            "Wallet connection rejected. Please approve the request in your wallet."
          );

          return;
        }

        setHookError(
          error?.message ||
            "Wallet connection failed."
        );
      }
    };

  const handleJoinPool = async () => {
    try {
      setHookLoading(true);
      setHookError("");
      setHookMessage("");
      setJoinPoolMessage("");

      if (!wallet?.address) {
        throw new Error(
          "Connect your wallet before entering a pool."
        );
      }

      if (!selectedPool) {
        throw new Error(
          "Select a pool first."
        );
      }

      if (
        !poolDepositAmount ||
        Number(poolDepositAmount) <= 0
      ) {
        throw new Error(
          "Enter a valid deposit amount."
        );
      }

      const data = await postToApi(
        "/api/join-pool",
        {
          owner: wallet.address,
          pair: selectedPool.pair,
          assetIndex:
            selectedPool.assetIndex,
          depositToken:
            poolDepositToken,
          amount: poolDepositAmount,
          strategy:
            "Dark Pool JIT Rebalancing",
        }
      );

      setJoinPoolMessage(
        data.message ||
          `Entered ${selectedPool.pair} with ${poolDepositAmount} ${poolDepositToken}.`
      );

      setHookMessage(
        data.txHash
          ? `Pool entry submitted: ${data.txHash}`
          : `Pool entry submitted on ${selectedNetwork.name} in demo mode.`
      );
    } catch (error) {
      setHookError(
        error?.message ||
          "Unable to enter pool."
      );
    } finally {
      setHookLoading(false);
    }
  };

  const handleUpdateInputs =
    async () => {
      try {
        setHookLoading(true);
        setHookError("");
        setHookMessage("");

        const data = await postToApi(
          "/api/update-risk-inputs",
          {
            owner: wallet?.address,
            pair:
              selectedPool?.pair ||
              "eBTC / eUSD",
            strategy:
              "Dark Pool JIT Rebalancing",
            rebalanceThresholdBps:
              rebalanceThreshold,
            volatilityBps,
          }
        );

        setHookMessage(
          data.message ||
            `Dark Pool JIT Strategy updated: ${
              data.txHash ||
              "demo-mode"
            }`
        );
      } catch (error) {
        setHookError(
          error?.message ||
            "Update failed."
        );
      } finally {
        setHookLoading(false);
      }
    };

  const handleDeactivatePlan =
    async () => {
      try {
        if (
          !window.confirm(
            "Confirm pausing Dark Pool JIT strategy?"
          )
        ) {
          return;
        }

        setHookLoading(true);
        setHookError("");
        setHookMessage("");

        const data = await postToApi(
          "/api/deactivate-plan",
          {
            owner: wallet?.address,
            pair:
              selectedPool?.pair ||
              "eBTC / eUSD",
            strategy:
              "Dark Pool JIT Rebalancing",
          }
        );

        setIsPlanActive(false);

        setHookMessage(
          data.message ||
            `Dark Pool JIT Strategy paused: ${
              data.txHash ||
              "demo-mode"
            }`
        );
      } catch (error) {
        setHookError(
          error?.message ||
            "Pause failed."
        );
      } finally {
        setHookLoading(false);
      }
    };

  const handleDecryptPayload =
    async () => {
      try {
        setDecryptOutput("");

        if (!wallet?.address) {
          throw new Error(
            "Connect your wallet before requesting private details."
          );
        }

        if (!targetEntityAddress) {
          throw new Error(
            "Target address required."
          );
        }

        setIsDecrypting(true);

        const data = await postToApi(
          "/api/encrypted-entity",
          {
            owner: wallet.address,
            target:
              targetEntityAddress,
            pair:
              selectedPool?.pair ||
              "eBTC / eUSD",
            strategy:
              "Dark Pool JIT Rebalancing",
          }
        );

        setDecryptOutput(
          JSON.stringify(data, null, 2)
        );
      } catch (error) {
        setDecryptOutput(
          `[Decrypt Error] ${
            error?.message ||
            "Decrypt failed."
          }`
        );
      } finally {
        setIsDecrypting(false);
      }
    };

  const handleGrantRowAccess =
    async (assetIndex, ticker) => {
      try {
        setHookError("");
        setHookMessage("");

        if (!wallet?.address) {
          throw new Error(
            "Connect your wallet before granting access."
          );
        }

        if (!viewerAddress) {
          throw new Error(
            "Viewer address required."
          );
        }

        const data = await postToApi(
          "/api/grant-position-view-access",
          {
            owner: wallet.address,
            viewer: viewerAddress,
            assetIndex,
            ticker,
            pair:
              selectedPool?.pair ||
              "eBTC / eUSD",
            strategy:
              "Dark Pool JIT Rebalancing",
          }
        );

        setHookMessage(
          data.message ||
            `Access granted for ${ticker}: ${
              data.txHash ||
              "demo-mode"
            }`
        );
      } catch (error) {
        setHookError(
          error?.message ||
            "Grant access failed."
        );
      }
    };

  const handleMockRebalance =
    async () => {
      try {
        setHookLoading(true);
        setHookError("");
        setHookMessage("");

        const data = await postToApi(
          "/api/mock-rebalance",
          {
            owner: wallet?.address,
            pair:
              selectedPool?.pair ||
              "eBTC / eUSD",
            strategy:
              "Dark Pool JIT Rebalancing",
            rebalanceThresholdBps:
              rebalanceThreshold,
            volatilityBps,
          }
        );

        setHookMessage(
          data.message ||
            `Mock rebalance triggered: ${
              data.txHash ||
              "demo-mode"
            }`
        );
      } catch (error) {
        setHookError(
          error?.message ||
            "Mock rebalance failed."
        );
      } finally {
        setHookLoading(false);
      }
    };

  const handleSelectEAsset = (
    asset
  ) => {
    setSelectedEAssetSymbol(
      asset.symbol
    );

    setEAssetSourceToken(
      asset.defaultCollateral
    );

    setEAssetDepositAmount("");
    setEAssetMintMessage("");
    setHookError("");
  };

  const handleMintEAsset =
    async () => {
      try {
        setHookLoading(true);
        setHookError("");
        setEAssetMintMessage("");

        if (!wallet?.address) {
          throw new Error(
            "Connect your wallet before minting an eAsset."
          );
        }

        if (
          !eAssetDepositAmount ||
          Number(eAssetDepositAmount) <=
            0
        ) {
          throw new Error(
            "Enter a valid deposit amount."
          );
        }

        const data = await postToApi(
          selectedEAsset.backendEndpoint,
          {
            owner: wallet.address,
            mintAsset:
              selectedEAsset.symbol,
            route:
              selectedEAsset.route,
            sourceChain:
              selectedEAsset.sourceChain,
            destinationChain:
              selectedEAsset.destinationChain,
            collateralToken:
              eAssetSourceToken,
            amount:
              eAssetDepositAmount,
            lockPeriod:
              eAssetLockPeriod,
          }
        );

        setEAssetMintMessage(
          data.message ||
            `Mint request submitted: ${eAssetDepositAmount} ${eAssetSourceToken} → ${selectedEAsset.symbol} on ${selectedNetwork.name}.`
        );
      } catch (error) {
        setHookError(
          error?.message ||
            "Mint route failed."
        );
      } finally {
        setHookLoading(false);
      }
    };

  const renderSchrodingerHookSection =
    () => (
      <div
        className="hl-terminal-workspace"
        style={{
          background: "#040404",
          border:
            "1px solid #1a1a1a",
          borderRadius: "6px",
          overflow: "hidden",
          color: "#ececec",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            padding: "12px 15px",
            borderBottom:
              "1px solid #1a1a1a",
            background: "#090909",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontWeight: "700",
                color: "#fff",
              }}
            >
              🎛️ COFFHEE STATUS:
            </span>

            <span
              style={{
                color: isPlanActive
                  ? "#a3e635"
                  : "#ef4444",
                fontWeight: "700",
              }}
            >
              {isPlanActive
                ? "● ACTIVE REBALANCE MONITORING"
                : "● DEACTIVATED PLAN"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "15px",
              color: "#888",
              fontFamily: "monospace",
            }}
          >
            <div>
              Network:
              <span
                style={{
                  color: "#fff",
                }}
              >
                {" "}
                {selectedNetwork.name}
              </span>
            </div>

            <div>
              Strategy:
              <span
                style={{
                  color: "#fff",
                }}
              >
                {" "}
                {schrodingerHookAddress.slice(
                  0,
                  6
                )}
                ...
                {schrodingerHookAddress.slice(
                  -4
                )}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "310px 1fr",
            minHeight: "500px",
          }}
        >
          <div
            style={{
              padding: "15px",
              borderRight:
                "1px solid #1a1a1a",
              background: "#070707",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <div
              style={{
                borderBottom:
                  "1px solid #1a1a1a",
                paddingBottom: "15px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#fff",
                  marginBottom: "4px",
                }}
              >
                Enter a Private Pool
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#777",
                  marginBottom: "15px",
                  lineHeight: 1.5,
                }}
              >
                Deposit your Coffhee
                assets into a private
                pool. The strategy
                monitors and rebalances
                in the background.
              </div>

              <div
                style={{
                  marginBottom: "12px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Select Pool
                </label>

                <select
                  value={
                    selectedPool?.pair ||
                    ""
                  }
                  onChange={(event) => {
                    const pool =
                      mockPools.find(
                        (item) =>
                          item.pair ===
                          event.target.value
                      );

                    setSelectedPool(
                      pool || null
                    );

                    setJoinPoolMessage(
                      ""
                    );
                  }}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "#111",
                    border:
                      "1px solid #222",
                    borderRadius: "4px",
                    color: "#fff",
                    outline: "none",
                  }}
                >
                  <option value="">
                    Choose a Pool
                  </option>

                  {mockPools.map(
                    (pool) => (
                      <option
                        key={pool.id}
                        value={pool.pair}
                      >
                        {pool.pair}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={{
                  marginBottom: "12px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Deposit Asset
                </label>

                <select
                  value={
                    poolDepositToken
                  }
                  onChange={(event) => {
                    setPoolDepositToken(
                      event.target.value
                    );

                    setJoinPoolMessage(
                      ""
                    );
                  }}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "#111",
                    border:
                      "1px solid #222",
                    borderRadius: "4px",
                    color: "#fff",
                    outline: "none",
                  }}
                >
                  <option>eUSD</option>
                  <option>eBTC</option>
                  <option>eETH</option>
                  <option>eLINK</option>
                  <option>eHYPE</option>
                  <option>eTSLA</option>
                </select>
              </div>

              <div
                style={{
                  marginBottom: "14px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={
                    poolDepositAmount
                  }
                  onChange={(event) => {
                    setPoolDepositAmount(
                      event.target.value
                    );

                    setJoinPoolMessage(
                      ""
                    );
                  }}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "#111",
                    border:
                      "1px solid #222",
                    borderRadius: "4px",
                    color: "#fff",
                    outline: "none",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {selectedPool && (
                <div
                  style={{
                    background: "#0b0b0b",
                    border:
                      "1px solid #1c1c1c",
                    borderRadius: "5px",
                    padding: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      marginBottom: "6px",
                    }}
                  >
                    {selectedPool.pair}
                  </div>

                  <div
                    style={{
                      color: "#888",
                      fontSize: "11px",
                    }}
                  >
                    Pool Type
                  </div>

                  <div
                    style={{
                      color: "#fff",
                      fontSize: "12px",
                      marginBottom: "10px",
                    }}
                  >
                    {
                      selectedPool.poolType
                    }
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      fontSize: "11px",
                      color: "#777",
                    }}
                  >
                    <span>Status</span>

                    <span
                      style={{
                        color: "#a3e635",
                      }}
                    >
                      {
                        selectedPool.status
                      }
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleJoinPool}
                disabled={
                  hookLoading ||
                  !selectedPool ||
                  !poolDepositAmount
                }
                style={{
                  width: "100%",
                  padding: "11px",
                  background: "#a3e635",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "700",
                  cursor:
                    hookLoading ||
                    !selectedPool ||
                    !poolDepositAmount
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    hookLoading ||
                    !selectedPool ||
                    !poolDepositAmount
                      ? 0.65
                      : 1,
                }}
              >
                {hookLoading
                  ? "Entering Pool..."
                  : "Enter Pool"}
              </button>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                <button
                  onClick={
                    handleUpdateInputs
                  }
                  disabled={hookLoading}
                  style={{
                    flex: 1,
                    padding: "6px",
                    background: "#161616",
                    border:
                      "1px solid #333",
                    color: "#fff",
                    fontSize: "11px",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Save Settings
                </button>

                {isPlanActive && (
                  <button
                    onClick={
                      handleDeactivatePlan
                    }
                    disabled={hookLoading}
                    style={{
                      padding: "6px",
                      background:
                        "rgba(239,68,68,0.1)",
                      border:
                        "1px solid #ef4444",
                      color: "#ef4444",
                      fontSize: "11px",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    Pause
                  </button>
                )}

                <button
                  onClick={
                    handleMockRebalance
                  }
                  disabled={hookLoading}
                  style={{
                    flex: 1,
                    padding: "6px",
                    background:
                      "rgba(163,230,21,0.08)",
                    border:
                      "1px solid #a3e635",
                    color: "#a3e635",
                    fontSize: "11px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Preview
                </button>
              </div>

              {joinPoolMessage && (
                <div
                  style={{
                    marginTop: "12px",
                    color: "#a3e635",
                    fontSize: "11px",
                  }}
                >
                  {joinPoolMessage}
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#a3e635",
                  marginBottom: "6px",
                  fontWeight: "700",
                }}
              >
                🔒 DECRYPTION FIELD
              </div>

              <div
                style={{
                  background: "#111",
                  border:
                    "1px solid #222",
                  padding: "6px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="text"
                  placeholder="Target token, pool, or position address"
                  value={
                    targetEntityAddress
                  }
                  onChange={(event) =>
                    setTargetEntityAddress(
                      event.target.value
                    )
                  }
                  style={{
                    background:
                      "transparent",
                    border: "none",
                    color: "#fff",
                    width: "100%",
                    fontSize: "11px",
                    outline: "none",
                    fontFamily:
                      "monospace",
                  }}
                />
              </div>

              <button
                onClick={
                  handleDecryptPayload
                }
                disabled={isDecrypting}
                style={{
                  width: "100%",
                  padding: "6px",
                  background: "#a3e635",
                  color: "#000",
                  border: "none",
                  borderRadius: "3px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {isDecrypting
                  ? "Computing Plaintext Vectors..."
                  : "Decrypt Active Entity"}
              </button>

              {decryptOutput && (
                <pre
                  style={{
                    background: "#020202",
                    border:
                      "1px solid #14250e",
                    padding: "8px",
                    borderRadius: "3px",
                    color: "#a3e635",
                    fontSize: "10px",
                    fontFamily:
                      "monospace",
                    whiteSpace:
                      "pre-wrap",
                    margin:
                      "10px 0 0 0",
                  }}
                >
                  {decryptOutput}
                </pre>
              )}
            </div>

            <div
              style={{
                marginTop: "auto",
                borderTop:
                  "1px solid #1a1a1a",
                paddingTop: "10px",
              }}
            >
              {hookMessage && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#a3e635",
                    marginBottom: "4px",
                  }}
                >
                  › {hookMessage}
                </div>
              )}

              {hookError && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#ef4444",
                    marginBottom: "4px",
                  }}
                >
                  › {hookError}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: "20px",
              background: "#050505",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "15px",
                borderBottom:
                  "1px solid #141414",
                paddingBottom: "10px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  Active Multi-Asset
                  Positions
                </h3>

                <div
                  style={{
                    fontSize: "10px",
                    color: "#666",
                    fontFamily:
                      "monospace",
                    marginTop: "4px",
                  }}
                >
                  Strategy:{" "}
                  {
                    schrodingerHookAddress
                  }
                </div>

                <p
                  style={{
                    margin:
                      "2px 0 0 0",
                    fontSize: "11px",
                    color: "#666",
                  }}
                >
                  Rebalancing positions
                  using encrypted tokens.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#111",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border:
                    "1px solid #222",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "#888",
                    whiteSpace: "nowrap",
                  }}
                >
                  Viewer Wallet Slot:
                </span>

                <input
                  type="text"
                  placeholder="0xAuditorAddress..."
                  value={viewerAddress}
                  onChange={(event) =>
                    setViewerAddress(
                      event.target.value
                    )
                  }
                  style={{
                    background:
                      "transparent",
                    border: "none",
                    color: "#fff",
                    fontSize: "11px",
                    width: "130px",
                    outline: "none",
                    fontFamily:
                      "monospace",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {initialPositions.map(
                (position) => (
                  <div
                    key={
                      position.assetIndex
                    }
                    style={{
                      background:
                        "#0b0b0b",
                      border:
                        "1px solid #1c1c1c",
                      borderRadius: "5px",
                      padding:
                        "12px 15px",
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            background:
                              "#222",
                            padding:
                              "2px 6px",
                            borderRadius:
                              "3px",
                            fontSize:
                              "10px",
                            color:
                              "#a3e635",
                            fontFamily:
                              "monospace",
                            fontWeight:
                              "700",
                          }}
                        >
                          INDEX{" "}
                          {
                            position.assetIndex
                          }
                        </span>

                        <strong
                          style={{
                            fontSize:
                              "14px",
                            color: "#fff",
                          }}
                        >
                          {position.pair}
                        </strong>

                        <span
                          style={{
                            fontSize:
                              "11px",
                            color: "#666",
                          }}
                        >
                          (
                          {
                            position.poolType
                          }
                          )
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize:
                            "11px",
                          color: "#888",
                          fontFamily:
                            "monospace",
                        }}
                      >
                        Asset:{" "}
                        {position.tokenAddress.slice(
                          0,
                          6
                        )}
                        ...
                        {position.tokenAddress.slice(
                          -4
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(4, 1fr)",
                        gap: "10px",
                        background:
                          "#070707",
                        padding:
                          "8px 12px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #141414",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              "10px",
                            color: "#555",
                          }}
                        >
                          ENCRYPTED EXPOSURE
                        </div>

                        <div
                          style={{
                            fontSize:
                              "12px",
                            color: "#fff",
                            fontFamily:
                              "monospace",
                            fontWeight:
                              "600",
                          }}
                        >
                          {
                            position.exposure
                          }
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize:
                              "10px",
                            color: "#555",
                          }}
                        >
                          TARGET ALLOCATION
                        </div>

                        <div
                          style={{
                            fontSize:
                              "12px",
                            color: "#aaa",
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {position.target}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize:
                              "10px",
                            color: "#555",
                          }}
                        >
                          CALCULATED DRIFT
                        </div>

                        <div
                          style={{
                            fontSize:
                              "12px",
                            color:
                              "#ef4444",
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {position.drift}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize:
                              "10px",
                            color: "#555",
                          }}
                        >
                          LAST REBALANCE DELTA
                        </div>

                        <div
                          style={{
                            fontSize:
                              "12px",
                            color:
                              "#a3e635",
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {
                            position.lastDelta
                          }
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        fontSize: "11px",
                        paddingTop: "4px",
                      }}
                    >
                      <div
                        style={{
                          color: "#a3e635",
                        }}
                      >
                        ● Status:{" "}
                        <span
                          style={{
                            color: "#ccc",
                          }}
                        >
                          {position.status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            setTargetEntityAddress(
                              position.tokenAddress
                            )
                          }
                          style={{
                            background:
                              "#161616",
                            border:
                              "1px solid #222",
                            color: "#bbb",
                            fontSize:
                              "10px",
                            padding:
                              "4px 8px",
                            borderRadius:
                              "2px",
                            cursor:
                              "pointer",
                          }}
                        >
                          Push to Decryptor
                        </button>

                        <button
                          onClick={() =>
                            handleGrantRowAccess(
                              position.assetIndex,
                              position.ticker
                            )
                          }
                          style={{
                            background:
                              "rgba(163,230,21,0.08)",
                            border:
                              "1px solid #a3e635",
                            color:
                              "#a3e635",
                            fontSize:
                              "10px",
                            padding:
                              "4px 8px",
                            borderRadius:
                              "2px",
                            cursor:
                              "pointer",
                            fontWeight:
                              "600",
                          }}
                        >
                          View Pool
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop: "auto",
                borderTop:
                  "1px solid #141414",
                paddingTop: "12px",
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: "11px",
                color: "#444",
              }}
            >
              <span>
                IPoolManager Routing
                Core: Verified
              </span>

              <span>
                beforeSwap: True
              </span>

              <span>
                afterSwap: True
              </span>
            </div>
          </div>
        </div>
      </div>
    );

  const renderLendSection = () => (
    <div className="marketplace-shell">
      <div className="marketplace-toolbar">
        <div className="search-box">
          <span>⌕</span>

          <input
            placeholder="Search dark derivative or credit pools"
          />
        </div>

        <div className="marketplace-filters">
          <button className="filter-chip active">
            All
          </button>

          <button className="filter-chip">
            Derivatives
          </button>

          <button className="filter-chip">
            Credit
          </button>

          <button className="filter-chip">
            Lower Risk
          </button>
        </div>
      </div>

      <div className="marketplace-table-wrap">
        <table className="marketplace-table">
          <thead>
            <tr>
              <th>Pool</th>
              <th>Type</th>
              <th>Est. Yield</th>
              <th>Entry</th>
              <th>Capacity</th>
              <th>Collateral</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {structuredPools.map(
              (pool) => (
                <tr key={pool.id}>
                  <td>
                    <div className="bond-name-cell">
                      <div className="bond-badge">
                        {pool.type ===
                        "Dark Credit"
                          ? "DC"
                          : "DD"}
                      </div>

                      <div>
                        <strong>
                          {pool.name}
                        </strong>

                        <span>
                          {pool.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{pool.type}</td>

                  <td className="green-text">
                    {pool.apr}
                  </td>

                  <td>{pool.price}</td>
                  <td>{pool.supply}</td>
                  <td>{pool.collateral}</td>

                  <td>
                    <button
                      className="table-action-btn"
                      onClick={() => {
                        setSelectedStructuredPool(
                          pool
                        );

                        setStructuredDepositAmount(
                          "1"
                        );

                        setStructuredActionMessage(
                          ""
                        );
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {selectedStructuredPool && (
        <div className="bond-info-card">
          <div className="bond-info-header">
            <div>
              <span className="bond-info-eyebrow">
                Selected Private Strategy
              </span>

              <h3>
                {
                  selectedStructuredPool.name
                }
              </h3>

              <p>
                {
                  selectedStructuredPool.description
                }
              </p>
            </div>

            <div className="bond-info-badge">
              Enter Pool
            </div>
          </div>

          <div className="bond-info-grid">
            <div className="bond-info-stat">
              <span>Pool Type</span>

              <strong>
                {
                  selectedStructuredPool.type
                }
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Est. Yield</span>

              <strong>
                {
                  selectedStructuredPool.apr
                }
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Collateral</span>

              <strong>
                {
                  selectedStructuredPool.collateral
                }
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Risk</span>

              <strong>
                {
                  selectedStructuredPool.risk
                }
              </strong>
            </div>
          </div>

          <div
            className="bond-info-grid"
            style={{
              marginTop: "12px",
            }}
          >
            <div className="bond-info-stat">
              <span>Structure</span>

              <strong>
                eAsset Pool
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Position Layer</span>

              <strong>Bond</strong>
            </div>

            <div className="bond-info-stat">
              <span>Settlement</span>

              <strong>eUSD</strong>
            </div>

            <div className="bond-info-stat">
              <span>Network</span>

              <strong>
                {selectedNetwork.name}
              </strong>
            </div>
          </div>

          <div className="bond-action-row">
            <div className="bond-amount-box">
              <label>
                Deposit Amount
              </label>

              <input
                type="number"
                min="1"
                value={
                  structuredDepositAmount
                }
                onChange={(event) =>
                  setStructuredDepositAmount(
                    event.target.value
                  )
                }
                className="bond-amount-input"
              />
            </div>

            <button
              className="primary-action bond-action-btn"
              onClick={() => {
                const amount = Number(
                  structuredDepositAmount
                );

                if (
                  !amount ||
                  amount <= 0
                ) {
                  setStructuredActionMessage(
                    "Enter a valid deposit amount."
                  );

                  return;
                }

                setStructuredActionMessage(
                  `Demo action: entered ${selectedStructuredPool.name} with ${amount} ${selectedStructuredPool.collateral} on ${selectedNetwork.name}.`
                );
              }}
            >
              Enter Private Pool
            </button>
          </div>

          {structuredActionMessage && (
            <p className="swap-helper-text success">
              {
                structuredActionMessage
              }
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderEusdSection = () => (
    <div className="terminal-card">
      <div className="terminal-header">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />

        <div className="terminal-title">
          root@coffhee:~/eassets
        </div>
      </div>

      <div className="eusd-layout">
        <div className="trade-card">
          <div className="card-topline">
            <span>Mint eAssets</span>

            <button className="mini-link">
              Route Settings
            </button>
          </div>

          <div className="collateral-switcher">
            {eAssetRoutes.map(
              (asset) => (
                <button
                  key={asset.symbol}
                  className={`filter-chip ${
                    selectedEAsset.symbol ===
                    asset.symbol
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleSelectEAsset(
                      asset
                    )
                  }
                >
                  {asset.symbol}
                </button>
              )
            )}
          </div>

          <div className="token-panel">
            <div className="token-panel-header">
              <span>
                {selectedEAsset.name}
              </span>

              <span>
                {
                  selectedEAsset.sourceChain
                }
                {selectedEAsset.sourceChain !==
                  selectedEAsset.destinationChain &&
                  ` → ${selectedEAsset.destinationChain}`}
              </span>
            </div>

            <div
              style={{
                padding: "12px 0",
                color: "#888",
                fontSize: "12px",
              }}
            >
              Lock supported collateral
              and mint{" "}
              {selectedEAsset.symbol} for
              use inside Coffhee private
              pools on{" "}
              {selectedNetwork.name}.
            </div>
          </div>

          <div className="token-panel">
            <div className="token-panel-header">
              <span>
                Collateral deposit
              </span>

              <span>
                Route:{" "}
                {selectedEAsset.route}
              </span>
            </div>

            <div className="token-row">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.0"
                value={
                  eAssetDepositAmount
                }
                onChange={(event) =>
                  setEAssetDepositAmount(
                    event.target.value
                  )
                }
                className="amount-input"
              />

              <select
                value={
                  eAssetSourceToken
                }
                onChange={(event) =>
                  setEAssetSourceToken(
                    event.target.value
                  )
                }
                className="token-select"
              >
                {selectedEAsset.acceptedCollateral.map(
                  (token) => (
                    <option
                      key={token}
                      value={token}
                    >
                      {token}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="limit-config-grid">
            <div className="config-card">
              <label>Lock Period</label>

              <select
                value={
                  eAssetLockPeriod
                }
                onChange={(event) =>
                  setEAssetLockPeriod(
                    event.target.value
                  )
                }
                className="config-input"
              >
                <option>7 Days</option>
                <option>30 Days</option>
                <option>90 Days</option>
                <option>180 Days</option>
              </select>
            </div>

            <div className="config-card">
              <label>You Receive</label>

              <input
                type="text"
                value={
                  eAssetDepositAmount
                    ? `${eAssetDepositAmount} ${selectedEAsset.symbol}`
                    : `0.0 ${selectedEAsset.symbol}`
                }
                readOnly
                className="config-input"
              />
            </div>
          </div>

          <div
            className="bond-info-grid"
            style={{
              marginTop: "14px",
              marginBottom: "14px",
            }}
          >
            <div className="bond-info-stat">
              <span>Mint Asset</span>

              <strong>
                {selectedEAsset.symbol}
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Collateral</span>

              <strong>
                {eAssetSourceToken}
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Destination</span>

              <strong>
                {selectedNetwork.name}
              </strong>
            </div>

            <div className="bond-info-stat">
              <span>Privacy</span>

              <strong>
                {
                  selectedNetwork.privacyProvider
                }
              </strong>
            </div>
          </div>

          <button
            className="primary-action"
            onClick={handleMintEAsset}
            disabled={hookLoading}
          >
            {hookLoading
              ? "Submitting..."
              : `Lock & Mint ${selectedEAsset.symbol}`}
          </button>

          {eAssetMintMessage && (
            <p className="swap-helper-text success">
              {eAssetMintMessage}
            </p>
          )}

          {hookError && (
            <p
              className="swap-helper-text"
              style={{
                color: "#ef4444",
              }}
            >
              {hookError}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <div className="matrix-bg" />

      <header className="topbar">
        <div
          className="brand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CoffheeLogoSvg className="logo-icon" />

          <div>
            <h1>COFFHEE</h1>

            <p>
              Encrypted Automated
              Market Maker
            </p>
          </div>
        </div>

        <nav className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${
                activeTab === tab
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveTab(tab)
              }
            >
              {tab}
            </button>
          ))}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <select
            value={selectedNetworkKey}
            onChange={
              handleNetworkChange
            }
            aria-label="Select Coffhee network"
            style={{
              height: "38px",
              padding: "0 10px",
              background: "#0b0b0b",
              border:
                "1px solid #2a2a2a",
              borderRadius: "4px",
              color: "#a3e635",
              fontSize: "12px",
              fontWeight: "700",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="arbitrumSepolia">
              Arbitrum Sepolia
            </option>

            <option value="ethereumSepolia">
              Ethereum Sepolia
            </option>
          </select>

          <button
            className="connect-btn"
            onClick={
              handleConnectWallet
            }
          >
            {wallet?.address
              ? `${wallet.address.slice(
                  0,
                  6
                )}...${wallet.address.slice(
                  -4
                )}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero-panel single-column">
          <div className="hero-copy compact-hero">
            <span className="status-pill">
              Demo ·{" "}
              {selectedNetwork.shortName}
            </span>

            <h2>{pageTitle}</h2>

            <p>{pageDesc}</p>
          </div>

          {activeTab === "Trade" &&
            renderSchrodingerHookSection()}

          {activeTab === "Markets" &&
            renderLendSection()}

          {activeTab === "eAssets" &&
            renderEusdSection()}
        </section>
      </main>
    </div>
  );
}

export default App;
