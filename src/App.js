import React, { useEffect, useState } from "react";
import "./App.css";
import {
  fetchSwapState,
  requestSwapWallet,
  getReadProvider,
} from "./lib/swap";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:3001";

const SCHRODINGER_HOOK_ADDRESS =
  "0xC4Dd117e53f9624ED2EE02e6c8CD662645F6e56A";

const tabs = ["Trade", "eRWA", "eUSD"];

// Structured position states matching your multi-asset Plan schema (MAX_ASSETS = 8)
const initialPositions = [
  {
    assetIndex: 0,
    pair: "cETH / eUSD",
    ticker: "cETH",
    tokenAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    exposure: "4,120 BPS",
    target: "5,000 BPS",
    drift: "880 BPS",
    lastDelta: "124 BPS",
    status: "Active Tracking",
    poolType: "Confidential Vault"
  },
  {
    assetIndex: 1,
    pair: "cFRAP / eUSD",
    ticker: "cFRAP",
    tokenAddress: "0x111111111117dc0aa78b770fa6a738034120c302",
    exposure: "2,450 BPS",
    target: "2,500 BPS",
    drift: "50 BPS",
    lastDelta: "12 BPS",
    status: "Balanced Delta",
    poolType: "Debt Instrument"
  },
  {
    assetIndex: 2,
    pair: "cWBTC / eUSD",
    ticker: "cWBTC",
    tokenAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    exposure: "1,890 BPS",
    target: "2,500 BPS",
    drift: "610 BPS",
    lastDelta: "95 BPS",
    status: "Evaluating Drift",
    poolType: "Encrypted Yield Pool"
  }
];

const ebondListings = [
  {
    id: "EBOND-001",
    name: "Frappucino Series A",
    maturity: "90 Days",
    apr: "8.20%",
    price: "$96.40",
    supply: "1,250",
    collateral: "USDC",
    description: "A short-duration fixed-income eBond backed by Coffhee protocol reserves.",
  },
  {
    id: "EBOND-002",
    name: "Espresso Yield Note",
    maturity: "180 Days",
    apr: "10.15%",
    price: "$93.10",
    supply: "820",
    collateral: "USD.e",
    description: "A medium-term yield note with a discounted entry price and a higher projected return profile.",
  },
  {
    id: "EBOND-003",
    name: "Latte Treasury Strip",
    maturity: "365 Days",
    apr: "12.60%",
    price: "$88.75",
    supply: "410",
    collateral: "USDT",
    description: "A long-duration eBond structured for demo treasury-style exposure, with deeper discounting.",
  },
];

function CoffheeLogoSvg({ className }) {
  return (
    <svg
      viewBox="0 0 350 450"
      className={className}
      style={{ width: "32px", height: "32px" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 60 120 L 80 410 C 80 425, 95 435, 110 435 L 240 435 C 255 435, 270 425, 270 410 L 290 120 Z"
        fill="none"
        stroke="#a3e635"
        strokeWidth="18"
        strokeLinejoin="round"
      />
      <path d="M 40 100 L 310 100" stroke="#a3e635" strokeWidth="20" strokeLinecap="round" />
      <path
        d="M 70 100 L 85 45 C 85 35, 95 25, 110 25 L 240 25 C 255 25, 265 35, 265 45 L 280 100"
        fill="none"
        stroke="#a3e635"
        strokeWidth="16"
        strokeLinejoin="round"
      />
      <path d="M 54 150 L 296 150" stroke="#a3e635" strokeWidth="16" />
      <path d="M 68 340 L 282 340" stroke="#a3e635" strokeWidth="16" />
      <path d="M 60 220 L 290 220" stroke="#a3e635" strokeWidth="12" />
      <path d="M 64 280 L 286 280" stroke="#a3e635" strokeWidth="12" />
      <circle cx="175" cy="250" r="42" fill="#111" stroke="#a3e635" strokeWidth="14" />
      <circle cx="175" cy="250" r="10" fill="#a3e635" />
    </svg>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("Trade");
  const [wallet, setWallet] = useState(null);
  const [hookLoading, setHookLoading] = useState(false);
  const [hookMessage, setHookMessage] = useState("");
  const [hookError, setHookError] = useState("");

  // Plan Controls
  const [rebalanceThreshold, setRebalanceThreshold] = useState("150");
  const [volatilityBps, setVolatilityBps] = useState("400");
  const [isPlanActive, setIsPlanActive] = useState(true);

  // Decrypt & Access Control State
  const [targetEntityAddress, setTargetEntityAddress] = useState("");
  const [decryptOutput, setDecryptOutput] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [viewerAddress, setViewerAddress] = useState("");

  // eUSD UI States
  const [eusdSourceToken, setEusdSourceToken] = useState("USDC");
  const [eusdDepositAmount, setEusdDepositAmount] = useState("");
  const [eusdLockPeriod, setEusdLockPeriod] = useState("30 Days");

  // eRWA Marketplace UI States
  const [selectedBond, setSelectedBond] = useState(ebondListings[0]);
  const [bondMintAmount, setBondMintAmount] = useState("1");
  const [bondActionMessage, setBondActionMessage] = useState("");

  const pageTitle = activeTab === "Trade" ? "Schrodinger Pools" : activeTab === "eRWA" ? "eRWA Marketplace" : "Mint eUSD";
  const pageDesc = activeTab === "Trade" 
    ? "The Schrödinger Hook is an automated portfolio manager that continuously monitors and rebalances assets without revealing the underlying strategy to the market."
    : activeTab === "eRWA" ? "Browse and acquire eRWA token listings backed by fixed-income products."
    : "Acquire the eUSD stablecoin by locking approved collateral assets into the protocol.";

  useEffect(() => {
    if (activeTab !== "Trade") return;
    let cancelled = false;

    async function loadHookContext() {
      try {
        setHookLoading(true);
        setHookError("");
        const provider = wallet?.provider || (await getReadProvider());
        await fetchSwapState(provider, wallet?.address);
      } catch (err) {
        if (!cancelled) setHookError("Node communications reporting uninitialized plan metadata.");
      } finally {
        if (!cancelled) setHookLoading(false);
      }
    }

    loadHookContext();
    return () => { cancelled = true; };
  }, [activeTab, wallet]);

  const handleConnectWallet = async () => {
  try {
    setHookError("");
    const connected = await requestSwapWallet();
    setWallet(connected);
    setHookMessage(
      `Node Authorized: ${connected.address.slice(0, 6)}...${connected.address.slice(-4)}`
    );
  } catch (err) {
    if (
      err?.code === 4001 ||
      err?.code === "ACTION_REJECTED" ||
      err?.message?.toLowerCase().includes("user rejected")
    ) {
      setHookError("Wallet connection rejected. Please approve the request in your wallet.");
      return;
    }

    setHookError(err.message || "Wallet connection failed.");
  }
};

  const handleUpdateInputs = async () => {
  try {
    setHookLoading(true);
    setHookError("");
    setHookMessage("");

    const res = await fetch(`${API_BASE}/api/update-risk-inputs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hookAddress: SCHRODINGER_HOOK_ADDRESS,
        owner: wallet?.address,
        pair: "eBTC / eUSD",
        strategy: "Dark Pool JIT Rebalancing",
        rebalanceThresholdBps: rebalanceThreshold,
        volatilityBps
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Update failed");
    }

    setHookMessage(
      data.message ||
        `Dark Pool JIT Strategy updated: ${data.txHash || "demo-mode"}`
    );
  } catch (err) {
    setHookError(err.message);
  } finally {
    setHookLoading(false);
  }
};

const handleDeactivatePlan = async () => {
  try {
    if (!window.confirm("Confirm pausing Dark Pool JIT strategy?")) {
      return;
    }

    setHookLoading(true);
    setHookError("");
    setHookMessage("");

    const res = await fetch(`${API_BASE}/api/deactivate-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hookAddress: SCHRODINGER_HOOK_ADDRESS,
        owner: wallet?.address,
        pair: "eBTC / eUSD",
        strategy: "Dark Pool JIT Rebalancing"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Pause failed");
    }

    setIsPlanActive(false);

    setHookMessage(
      data.message ||
        `Dark Pool JIT Strategy paused: ${data.txHash || "demo-mode"}`
    );
  } catch (err) {
    setHookError(err.message);
  } finally {
    setHookLoading(false);
  }
};

const handleDecryptPayload = async () => {
  try {
    setDecryptOutput("");

    if (!targetEntityAddress) {
      throw new Error("Target address required");
    }

    setIsDecrypting(true);

    const res = await fetch(`${API_BASE}/api/encrypted-entity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hookAddress: SCHRODINGER_HOOK_ADDRESS,
        owner: wallet?.address,
        target: targetEntityAddress,
        pair: "eBTC / eUSD",
        strategy: "Dark Pool JIT Rebalancing"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Decrypt failed");
    }

    setDecryptOutput(JSON.stringify(data, null, 2));
  } catch (err) {
    setDecryptOutput(`[Decrypt Error] ${err.message}`);
  } finally {
    setIsDecrypting(false);
  }
};

const handleGrantRowAccess = async (assetIndex, ticker) => {
  try {
    setHookError("");
    setHookMessage("");

    if (!viewerAddress) {
      throw new Error("Viewer address required");
    }

    const res = await fetch(`${API_BASE}/api/grant-position-view-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hookAddress: SCHRODINGER_HOOK_ADDRESS,
        owner: wallet?.address,
        viewer: viewerAddress,
        assetIndex,
        ticker,
        pair: "eBTC / eUSD",
        strategy: "Dark Pool JIT Rebalancing"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Grant access failed");
    }

    setHookMessage(
      data.message || `Access granted for ${ticker}: ${data.txHash || "demo-mode"}`
    );
  } catch (err) {
    setHookError(err.message);
  }
};

const handleMockRebalance = async () => {
  try {
    setHookLoading(true);
    setHookError("");
    setHookMessage("");

    const res = await fetch(`${API_BASE}/api/mock-rebalance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hookAddress: SCHRODINGER_HOOK_ADDRESS,
        owner: wallet?.address,
        pair: "eBTC / eUSD",
        strategy: "Dark Pool JIT Rebalancing",
        rebalanceThresholdBps: rebalanceThreshold,
        volatilityBps
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Mock rebalance failed");
    }

    setHookMessage(
      data.message ||
        `Mock rebalance triggered: ${data.txHash || "demo-mode"}`
    );
  } catch (err) {
    setHookError(err.message);
  } finally {
    setHookLoading(false);
  }
};

  // Missing eRWA Context Actions Resolved Here
  const handleViewBond = (bond) => {
    setSelectedBond(bond);
    setBondMintAmount("1");
    setBondActionMessage("");
  };

  const handleMintBond = () => {
    if (!selectedBond) return;
    const qty = Number(bondMintAmount);
    if (!qty || qty <= 0) {
      setBondActionMessage("Enter a valid token amount.");
      return;
    }
    setBondActionMessage(`Demo action: ${qty} units of ${selectedBond.id} token purchased.`);
  };

  const renderSchrodingerHookSection = () => {
    return (
      <div className="hl-terminal-workspace" style={{ background: "#040404", border: "1px solid #1a1a1a", borderRadius: "6px", overflow: "hidden", color: "#ececec" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", borderBottom: "1px solid #1a1a1a", background: "#090909", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "700", color: "#fff" }}>🎛️ COFFHEE STATUS:</span>
            <span style={{ color: isPlanActive ? "#a3e635" : "#ef4444", fontWeight: "700" }}>
              {isPlanActive ? "● ACTIVE REBALANCE MONITORING" : "● DEACTIVATED PLAN"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "15px", color: "#888", fontFamily: "monospace" }}>
          <div>
            Network:
              <span style={{ color: "#fff" }}>
                {" "}Arbitrum Sepolia
              </span>
          </div>

          <div>
            Strategy:
              <span style={{ color: "#fff" }}>
                {" "}
                {SCHRODINGER_HOOK_ADDRESS.slice(0, 6)}
                ...
                {SCHRODINGER_HOOK_ADDRESS.slice(-4)}
              </span>
          </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", minHeight: "500px" }}>
          <div style={{ padding: "15px", borderRight: "1px solid #1a1a1a", background: "#070707", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: "15px" }}>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px", fontWeight: "700" }}>Dark Pool Strategy Setting</div>
              
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontSize: "10px", color: "#666", marginBottom: "3px" }}>rebalanceThresholdBps</label>
                <div style={{ background: "#111", border: "1px solid #222", padding: "4px 8px", borderRadius: "3px", display: "flex" }}>
                  <input type="number" value={rebalanceThreshold} onChange={(e) => setRebalanceThreshold(e.target.value)} style={{ background: "transparent", border: "none", color: "#fff", width: "100%", fontSize: "12px", outline: "none" }} />
                  <span style={{ fontSize: "10px", color: "#444" }}>BPS</span>
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "10px", color: "#666", marginBottom: "3px" }}>volatilityBps</label>
                <div style={{ background: "#111", border: "1px solid #222", padding: "4px 8px", borderRadius: "3px", display: "flex" }}>
                  <input type="number" value={volatilityBps} onChange={(e) => setVolatilityBps(e.target.value)} style={{ background: "transparent", border: "none", color: "#fff", width: "100%", fontSize: "12px", outline: "none" }} />
                  <span style={{ fontSize: "10px", color: "#444" }}>BPS</span>
                </div>
              </div>

             <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleUpdateInputs}
                disabled={hookLoading}
                style={{
                 flex: 1,
                 padding: "6px",
                 background: "#161616",
                 border: "1px solid #333",
                 color: "#fff",
                 fontSize: "11px",
                 borderRadius: "3px",
                 cursor: "pointer"
                 }}
               >
               Update Strategy
              </button>

              {isPlanActive && (
             <button
          onClick={handleDeactivatePlan}
          style={{
            padding: "6px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid #ef4444",
            color: "#ef4444",
            fontSize: "11px",
            borderRadius: "3px",
            cursor: "pointer"
           }}
           >
            Pause Plan
          </button>
        )}

        <button
            onClick={handleMockRebalance}
            disabled={hookLoading}
          style={{
            flex: 1,
            padding: "6px",
            background: "rgba(163,230,21,0.08)",
            border: "1px solid #a3e635",
            color: "#a3e635",
            fontSize: "11px",
            borderRadius: "3px",
            cursor: "pointer",
            fontWeight: "600"
           }}
         >
          Run Mock Rebalance
          </button>
            </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#a3e635", marginBottom: "6px", fontWeight: "700" }}>🔒 DECRYPTION FIELD</div>
              <div style={{ background: "#111", border: "1px solid #222", padding: "6px", borderRadius: "4px", marginBottom: "8px" }}>
                <input 
                  type="text" 
                  placeholder="Target token, pool, or position address" 
                  value={targetEntityAddress}
                  onChange={(e) => setTargetEntityAddress(e.target.value)}
                  style={{ background: "transparent", border: "none", color: "#fff", width: "100%", fontSize: "11px", outline: "none", fontFamily: "monospace" }}
                />
              </div>
              <button onClick={handleDecryptPayload} disabled={isDecrypting} style={{ width: "100%", padding: "6px", background: "#a3e635", color: "#000", border: "none", borderRadius: "3px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                {isDecrypting ? "Computing Plaintext Vectors..." : "Decrypt Active Entity"}
              </button>

              {decryptOutput && (
                <pre style={{ background: "#020202", border: "1px solid #14250e", padding: "8px", borderRadius: "3px", color: "#a3e635", fontSize: "10px", fontFamily: "monospace", whiteSpace: "pre-wrap", marginTop: "10px", margin: "10px 0 0 0" }}>
                  {decryptOutput}
                </pre>
              )}
            </div>

            <div style={{ marginTop: "auto", borderTop: "1px solid #1a1a1a", paddingTop: "10px" }}>
              {hookMessage && <div style={{ fontSize: "10px", color: "#a3e635", marginBottom: "4px" }}>› {hookMessage}</div>}
              {hookError && <div style={{ fontSize: "10px", color: "#ef4444", marginBottom: "4px" }}>› {hookError}</div>}
            </div>
          </div>

          <div style={{ padding: "20px", background: "#050505", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #141414", paddingBottom: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#fff" }}>Active Multi-Asset Positions</h3>
                <div
                  style={{
                  fontSize: "10px",
                  color: "#666",
                  fontFamily: "monospace",
                  marginTop: "4px"
                  }}
                  >
                  Strategy: {SCHRODINGER_HOOK_ADDRESS}
                </div>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#666" }}>
                  Rebalancing positions using encrypted tokens.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111", padding: "4px 8px", borderRadius: "4px", border: "1px solid #222" }}>
                <span style={{ fontSize: "10px", color: "#888", whiteSpace: "nowrap" }}>Viewer Wallet Slot:</span>
                <input 
                  type="text" 
                  placeholder="0xAuditorAddress..." 
                  value={viewerAddress}
                  onChange={(e) => setViewerAddress(e.target.value)}
                  style={{ background: "transparent", border: "none", color: "#fff", fontSize: "11px", width: "130px", outline: "none", fontFamily: "monospace" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {initialPositions.map((pos) => (
                <div 
                  key={pos.assetIndex}
                  style={{ background: "#0b0b0b", border: "1px solid #1c1c1c", borderRadius: "5px", padding: "12px 15px", display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ background: "#222", padding: "2px 6px", borderRadius: "3px", fontSize: "10px", color: "#a3e635", fontFamily: "monospace", fontWeight: "700" }}>
                        INDEX {pos.assetIndex}
                      </span>
                      <strong style={{ fontSize: "14px", color: "#fff" }}>{pos.pair}</strong>
                      <span style={{ fontSize: "11px", color: "#666" }}>({pos.poolType})</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#888", fontFamily: "monospace" }}>
                      Asset: {pos.tokenAddress.slice(0, 6)}...{pos.tokenAddress.slice(-4)}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", background: "#070707", padding: "8px 12px", borderRadius: "4px", border: "1px solid #141414" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555" }}>ENCRYPTED EXPOSURE</div>
                      <div style={{ fontSize: "12px", color: "#fff", fontFamily: "monospace", fontWeight: "600" }}>{pos.exposure}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555" }}>TARGET ALLOCATION</div>
                      <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace" }}>{pos.target}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555" }}>CALCULATED DRIFT</div>
                      <div style={{ fontSize: "12px", color: "#ef4444", fontFamily: "monospace" }}>{pos.drift}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555" }}>LAST REBALANCE DELTA</div>
                      <div style={{ fontSize: "12px", color: "#a3e635", fontFamily: "monospace" }}>{pos.lastDelta}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", paddingTop: "4px" }}>
                    <div style={{ color: "#a3e635" }}>
                      ● Status: <span style={{ color: "#ccc" }}>{pos.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => setTargetEntityAddress(pos.tokenAddress)}
                        style={{ background: "#161616", border: "1px solid #222", color: "#bbb", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer" }}
                      >
                        Push to Decryptor
                      </button>
                      <button 
                        onClick={() => handleGrantRowAccess(pos.assetIndex, pos.ticker)}
                        style={{ background: "rgba(163,230,21,0.08)", border: "1px solid #a3e635", color: "#a3e635", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer", fontWeight: "600" }}
                      >
                        grantPositionViewAccess()
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", borderTop: "1px solid #141414", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#444" }}>
              <span>IPoolManager Routing Core: Verified</span>
              <span>beforeSwap: True</span>
              <span>afterSwap: True</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLendSection = () => {
    return (
      <div className="marketplace-shell">
        <div className="marketplace-toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input placeholder="Search eBond listings" />
          </div>
          <div className="marketplace-filters">
            <button className="filter-chip active">All</button>
            <button className="filter-chip">Short Term</button>
            <button className="filter-chip">Mid Term</button>
            <button className="filter-chip">Long Term</button>
          </div>
        </div>

        <div className="marketplace-table-wrap">
          <table className="marketplace-table">
            <thead>
              <tr>
                <th>Bond</th>
                <th>Maturity</th>
                <th>APR</th>
                <th>Price</th>
                <th>Supply</th>
                <th>Collateral</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ebondListings.map((bond) => (
                <tr key={bond.id}>
                  <td>
                    <div className="bond-name-cell">
                      <div className="bond-badge">eB</div>
                      <div>
                        <strong>{bond.name}</strong>
                        <span>{bond.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>{bond.maturity}</td>
                  <td className="green-text">{bond.apr}</td>
                  <td>{bond.price}</td>
                  <td>{bond.supply}</td>
                  <td>{bond.collateral}</td>
                  <td>
                    <button className="table-action-btn" onClick={() => handleViewBond(bond)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedBond && (
          <div className="bond-info-card">
            <div className="bond-info-header">
              <div>
                <span className="bond-info-eyebrow">Selected eRWA</span>
                <h3>{selectedBond.name}</h3>
                <p>{selectedBond.description}</p>
              </div>
              <div className="bond-info-badge">Mint / Purchase</div>
            </div>

            <div className="bond-info-grid">
              <div className="bond-info-stat">
                <span>Maturity</span>
                <strong>{selectedBond.maturity}</strong>
              </div>
              <div className="bond-info-stat">
                <span>APR</span>
                <strong>{selectedBond.apr}</strong>
              </div>
              <div className="bond-info-stat">
                <span>Price</span>
                <strong>{selectedBond.price}</strong>
              </div>
              <div className="bond-info-stat">
                <span>Collateral</span>
                <strong>{selectedBond.collateral}</strong>
              </div>
            </div>

            <div className="bond-action-row">
              <div className="bond-amount-box">
                <label>Token Amount</label>
                <input
                  type="number"
                  min="1"
                  value={bondMintAmount}
                  onChange={(e) => setBondMintAmount(e.target.value)}
                  className="bond-amount-input"
                />
              </div>
              <button className="primary-action bond-action-btn" onClick={handleMintBond}>
                Purchase / Mint Token
              </button>
            </div>
            {bondActionMessage && <p className="swap-helper-text success">{bondActionMessage}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderEusdSection = () => {
    return (
      <div className="terminal-card">
        <div className="terminal-header">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <div className="terminal-title">root@coffhee:~/eusd</div>
        </div>

        <div className="eusd-layout">
          <div className="trade-card">
            <div className="card-topline">
              <span>Mint eUSD</span>
              <button className="mini-link">Vault Settings</button>
            </div>

            <div className="collateral-switcher">
              {["USD.e", "USDC", "USDT"].map((token) => (
                <button
                  key={token}
                  className={`filter-chip ${eusdSourceToken === token ? "active" : ""}`}
                  onClick={() => setEusdSourceToken(token)}
                >
                  {token}
                </button>
              ))}
            </div>

            <div className="token-panel">
              <div className="token-panel-header">
                <span>Collateral deposit</span>
                <span>Wallet: 12,000.00</span>
              </div>
              <div className="token-row">
                <input
                  type="number"
                  placeholder="0.0"
                  value={eusdDepositAmount}
                  onChange={(e) => setEusdDepositAmount(e.target.value)}
                  className="amount-input"
                />
                <button className="token-select">{eusdSourceToken}</button>
              </div>
            </div>

            <div className="limit-config-grid">
              <div className="config-card">
                <label>Lock Period</label>
                <select value={eusdLockPeriod} onChange={(e) => setEusdLockPeriod(e.target.value)} className="config-input">
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                  <option>180 Days</option>
                </select>
              </div>

              <div className="config-card">
                <label>Estimated eUSD</label>
                <input type="text" value={eusdDepositAmount ? eusdDepositAmount : "0.0"} readOnly className="config-input" />
              </div>
            </div>

            <button className="primary-action">Lock & Mint eUSD</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <div className="matrix-bg" />

      <header className="topbar">
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CoffheeLogoSvg className="logo-icon" />
          <div>
            <h1>COFFHEE</h1>
            <p>Encrypted Automated Market Maker</p>
          </div>
        </div>

        <nav className="nav-tabs">
          {tabs.map((tab) => (
            <button key={tab} className={`nav-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>

        <button className="connect-btn" onClick={activeTab === "Trade" ? handleConnectWallet : undefined}>
          {wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Connect Wallet"}
        </button>
      </header>

      <main className="main-content">
        <section className="hero-panel single-column">
          <div className="hero-copy compact-hero">
            <span className="status-pill">Demo</span>
            <h2>{pageTitle}</h2>
            <p>{pageDesc}</p>
          </div>

          {activeTab === "Trade" && renderSchrodingerHookSection()}
          {activeTab === "eRWA" && renderLendSection()}
          {activeTab === "eUSD" && renderEusdSection()}
        </section>
      </main>
    </div>
  );
}

export default App;
