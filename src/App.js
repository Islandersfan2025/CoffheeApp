import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  fetchSwapState,
  requestSwapWallet,
  approveSwapOperator,
  swapTokenAForB,
  swapTokenBForA,
  estimateSwapOutputRaw,
  parseUnitsSafe,
  formatUnitsSafe,
  getReadProvider,
} from "./lib/swap";

const tabs = ["Swap", "Limit", "Lend", "eUSD"];

const ebondListings = [
  {
    id: "EBOND-001",
    name: "Frappucino Series A",
    maturity: "90 Days",
    apr: "8.20%",
    price: "$96.40",
    supply: "1,250",
    collateral: "USDC",
    description:
      "A short-duration fixed-income eBond backed by Coffhee protocol reserves, designed for simple demo marketplace purchases.",
  },
  {
    id: "EBOND-002",
    name: "Espresso Yield Note",
    maturity: "180 Days",
    apr: "10.15%",
    price: "$93.10",
    supply: "820",
    collateral: "USD.e",
    description:
      "A medium-term yield note with a discounted entry price and a higher projected return profile for marketplace buyers.",
  },
  {
    id: "EBOND-003",
    name: "Latte Treasury Strip",
    maturity: "365 Days",
    apr: "12.60%",
    price: "$88.75",
    supply: "410",
    collateral: "USDT",
    description:
      "A long-duration eBond structured for demo treasury-style exposure, with deeper discounting and longer maturity.",
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("Swap");

  const [wallet, setWallet] = useState(null);
  const [swapState, setSwapState] = useState(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [swapMessage, setSwapMessage] = useState("");
  const [swapError, setSwapError] = useState("");
  const [swapDirection, setSwapDirection] = useState("A_TO_B");
  const [swapFromAmount, setSwapFromAmount] = useState("");
  const [swapToAmount, setSwapToAmount] = useState("");

  const [limitSellToken] = useState("ETH");
  const [limitBuyToken] = useState("FRAP");
  const [limitSellAmount, setLimitSellAmount] = useState("");
  const [limitBuyAmount, setLimitBuyAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("2450.00");
  const [limitExpiry, setLimitExpiry] = useState("7 Days");
  const [limitDirection, setLimitDirection] = useState("Buy when below");

  const [eusdSourceToken, setEusdSourceToken] = useState("USDC");
  const [eusdDepositAmount, setEusdDepositAmount] = useState("");
  const [eusdLockPeriod, setEusdLockPeriod] = useState("30 Days");

  const [selectedBond, setSelectedBond] = useState(ebondListings[0]);
  const [bondMintAmount, setBondMintAmount] = useState("1");
  const [bondActionMessage, setBondActionMessage] = useState("");

  const pageMeta = useMemo(() => {
    switch (activeTab) {
      case "Swap":
        return {
          title: "Encrypted Token Swap",
          description:
            "Swap confidential assets through the CoffheeSwap contract with a focused terminal-style interface and operator approval flow.",
        };
      case "Limit":
        return {
          title: "Limit Order Terminal",
          description:
            "Create precision orders with a Sushi-style workflow, configurable trigger price, expiry, and execution summary.",
        };
      case "Lend":
        return {
          title: "eBond Marketplace",
          description:
            "Browse and acquire eBond token listings backed by Coffhee Finance fixed-income products.",
        };
      case "eUSD":
        return {
          title: "Mint eUSD",
          description:
            "Acquire the eUSD stablecoin by locking approved collateral assets such as USD.e, USDC, or USDT into the protocol.",
        };
      default:
        return {
          title: "Coffhee Finance",
          description: "",
        };
    }
  }, [activeTab]);

  const currentSwapPair = useMemo(() => {
    if (!swapState) {
      return {
        from: { symbol: "Token A", address: "", approved: false, decimals: 18 },
        to: { symbol: "Token B", address: "", approved: false, decimals: 18 },
        rateNumerator: 0,
        rateDenominator: 1,
        rateLabel: "—",
      };
    }

    if (swapDirection === "A_TO_B") {
      return {
        from: swapState.tokenA,
        to: swapState.tokenB,
        rateNumerator: swapState.rates.aToB.numerator,
        rateDenominator: swapState.rates.aToB.denominator,
        rateLabel: `${swapState.rates.aToB.numerator.toString()} / ${swapState.rates.aToB.denominator.toString()}`,
      };
    }

    return {
      from: swapState.tokenB,
      to: swapState.tokenA,
      rateNumerator: swapState.rates.bToA.numerator,
      rateDenominator: swapState.rates.bToA.denominator,
      rateLabel: `${swapState.rates.bToA.numerator.toString()} / ${swapState.rates.bToA.denominator.toString()}`,
    };
  }, [swapDirection, swapState]);

  useEffect(() => {
    if (activeTab !== "Swap") return;

    let cancelled = false;

    async function loadSwapData() {
      try {
        setSwapLoading(true);
        setSwapError("");
        setSwapMessage("");

        const provider = wallet?.provider || (await getReadProvider());
        const nextState = await fetchSwapState(provider, wallet?.address);
        if (!cancelled) {
          setSwapState(nextState);
        }
      } catch (err) {
        if (!cancelled) {
          setSwapError(err.message || "Failed to load swap state.");
        }
      } finally {
        if (!cancelled) {
          setSwapLoading(false);
        }
      }
    }

    loadSwapData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, wallet]);

  useEffect(() => {
    if (!swapState || !swapFromAmount || Number(swapFromAmount) <= 0) {
      setSwapToAmount("");
      return;
    }

    try {
      const amountRaw = parseUnitsSafe(swapFromAmount, currentSwapPair.from.decimals);
      const outRaw = estimateSwapOutputRaw(
        amountRaw,
        currentSwapPair.rateNumerator,
        currentSwapPair.rateDenominator
      );
      setSwapToAmount(formatUnitsSafe(outRaw, currentSwapPair.to.decimals, 6));
    } catch {
      setSwapToAmount("");
    }
  }, [swapFromAmount, swapState, currentSwapPair]);

  const handleConnectWallet = async () => {
    try {
      setSwapError("");
      const connected = await requestSwapWallet();
      setWallet(connected);
      setSwapMessage(
        `Connected ${connected.address.slice(0, 6)}...${connected.address.slice(-4)}`
      );
    } catch (err) {
      setSwapError(err.message || "Wallet connection failed.");
    }
  };

  const handleSwapFlip = () => {
    setSwapDirection((prev) => (prev === "A_TO_B" ? "B_TO_A" : "A_TO_B"));
    setSwapFromAmount("");
    setSwapToAmount("");
    setSwapMessage("");
    setSwapError("");
  };

  const handleApproveSwap = async () => {
    try {
      setSwapError("");
      setSwapMessage("");

      const connected = wallet || (await requestSwapWallet());
      if (!wallet) {
        setWallet(connected);
      }

      if (!swapState) {
        throw new Error("Swap state not loaded yet.");
      }

      setSwapSubmitting(true);

      await approveSwapOperator({
        signer: connected.signer,
        tokenAddress: currentSwapPair.from.address,
      });

      const refreshed = await fetchSwapState(connected.provider, connected.address);
      setSwapState(refreshed);
      setSwapMessage(`Operator approved for ${currentSwapPair.from.symbol}.`);
    } catch (err) {
      setSwapError(err.message || "Approval failed.");
    } finally {
      setSwapSubmitting(false);
    }
  };

  const handleExecuteSwap = async () => {
    try {
      setSwapError("");
      setSwapMessage("");

      if (!swapFromAmount || Number(swapFromAmount) <= 0) {
        throw new Error("Enter an amount to swap.");
      }

      const connected = wallet || (await requestSwapWallet());
      if (!wallet) {
        setWallet(connected);
      }

      const amountRaw = parseUnitsSafe(swapFromAmount, currentSwapPair.from.decimals);

      setSwapSubmitting(true);

      if (swapDirection === "A_TO_B") {
        await swapTokenAForB({
          signer: connected.signer,
          amountRaw,
        });
      } else {
        await swapTokenBForA({
          signer: connected.signer,
          amountRaw,
        });
      }

      const refreshed = await fetchSwapState(connected.provider, connected.address);
      setSwapState(refreshed);
      setSwapMessage(
        `Swap submitted: ${swapFromAmount} ${currentSwapPair.from.symbol} → ~${swapToAmount || "0"} ${currentSwapPair.to.symbol}`
      );
      setSwapFromAmount("");
      setSwapToAmount("");
    } catch (err) {
      setSwapError(err.message || "Swap failed.");
    } finally {
      setSwapSubmitting(false);
    }
  };

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

    setBondActionMessage(
      `Demo action: ${qty} ${selectedBond.id} token${qty > 1 ? "s" : ""} ready to purchase/mint.`
    );
  };

  const renderSwapSection = () => {
    const needsApproval = !!swapState && !currentSwapPair.from.approved;

    return (
      <div className="terminal-card swap-card-centered">
        <div className="terminal-header">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <div className="terminal-title">root@coffhee:~/swap</div>
        </div>

        <div className="trade-card">
          <div className="card-topline">
            <span>Swap</span>
            <button className="mini-link" onClick={handleConnectWallet}>
              {wallet?.address
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : "Connect Wallet"}
            </button>
          </div>

          <div className="token-panel">
            <div className="token-panel-header">
              <span>You pay</span>
              <span>{swapState ? currentSwapPair.from.symbol : "Loading..."}</span>
            </div>
            <div className="token-row">
              <input
                type="number"
                placeholder="0.0"
                value={swapFromAmount}
                onChange={(e) => setSwapFromAmount(e.target.value)}
                className="amount-input"
              />
              <button className="token-select">
                {swapState ? currentSwapPair.from.symbol : "Token A"}
              </button>
            </div>
          </div>

          <button className="flip-btn" onClick={handleSwapFlip}>
            ⇅
          </button>

          <div className="token-panel">
            <div className="token-panel-header">
              <span>You receive</span>
              <span>{swapState ? currentSwapPair.to.symbol : "Loading..."}</span>
            </div>
            <div className="token-row">
              <input
                type="number"
                placeholder="0.0"
                value={swapToAmount}
                readOnly
                className="amount-input"
              />
              <button className="token-select">
                {swapState ? currentSwapPair.to.symbol : "Token B"}
              </button>
            </div>
          </div>

          <div className="detail-box">
            <div className="detail-row">
              <span>Route</span>
              <span>
                {swapState
                  ? `${currentSwapPair.from.symbol} → ${currentSwapPair.to.symbol}`
                  : "—"}
              </span>
            </div>
            <div className="detail-row">
              <span>Rate</span>
              <span>{currentSwapPair.rateLabel}</span>
            </div>
            <div className="detail-row">
              <span>Operator</span>
              <span>{needsApproval ? "Approval needed" : "Approved"}</span>
            </div>
            <div className="detail-row">
              <span>Network</span>
              <span>Arbitrum Sepolia</span>
            </div>
          </div>

          {swapLoading && <p className="swap-helper-text">Loading swap contract state…</p>}
          {swapMessage && <p className="swap-helper-text success">{swapMessage}</p>}
          {swapError && <p className="swap-helper-text error">{swapError}</p>}

          <div className="swap-action-stack">
            <button
              className="secondary-action"
              onClick={handleApproveSwap}
              disabled={swapSubmitting || swapLoading || !swapState || !needsApproval}
            >
              {needsApproval ? `Approve ${currentSwapPair.from.symbol}` : "Operator Approved"}
            </button>

            <button
              className="primary-action"
              onClick={handleExecuteSwap}
              disabled={swapSubmitting || swapLoading || !swapState}
            >
              {swapSubmitting ? "Processing..." : "Execute Swap"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLimitSection = () => {
    return (
      <div className="terminal-card limit-shell">
        <div className="terminal-header">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <div className="terminal-title">root@coffhee:~/limit</div>
        </div>

        <div className="limit-layout">
          <div className="limit-main-card">
            <div className="limit-topbar">
              <div className="limit-mini-tabs">
                <button className="mini-tab active">Limit</button>
                <button className="mini-tab">Stop</button>
                <button className="mini-tab">Recurring</button>
              </div>
              <button className="mini-link">Advanced</button>
            </div>

            <div className="order-type-group">
              <button
                className={`order-toggle ${limitDirection === "Buy when below" ? "active" : ""}`}
                onClick={() => setLimitDirection("Buy when below")}
              >
                Buy when below
              </button>
              <button
                className={`order-toggle ${limitDirection === "Sell when above" ? "active" : ""}`}
                onClick={() => setLimitDirection("Sell when above")}
              >
                Sell when above
              </button>
            </div>

            <div className="token-panel">
              <div className="token-panel-header">
                <span>Sell token</span>
                <span>Wallet: 2.4100</span>
              </div>
              <div className="token-row">
                <input
                  type="number"
                  placeholder="0.0"
                  value={limitSellAmount}
                  onChange={(e) => setLimitSellAmount(e.target.value)}
                  className="amount-input"
                />
                <button className="token-select">{limitSellToken}</button>
              </div>
            </div>

            <div className="limit-divider">Trigger</div>

            <div className="token-panel">
              <div className="token-panel-header">
                <span>Receive token</span>
                <span>Wallet: 1520.55</span>
              </div>
              <div className="token-row">
                <input
                  type="number"
                  placeholder="0.0"
                  value={limitBuyAmount}
                  onChange={(e) => setLimitBuyAmount(e.target.value)}
                  className="amount-input"
                />
                <button className="token-select">{limitBuyToken}</button>
              </div>
            </div>

            <div className="limit-config-grid">
              <div className="config-card">
                <label>Limit Price</label>
                <input
                  type="text"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="config-input"
                />
                <small>
                  1 {limitSellToken} = {limitPrice} {limitBuyToken}
                </small>
              </div>

              <div className="config-card">
                <label>Expiry</label>
                <select
                  value={limitExpiry}
                  onChange={(e) => setLimitExpiry(e.target.value)}
                  className="config-input"
                >
                  <option>1 Day</option>
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                </select>
                <small>Order cancels automatically after expiry.</small>
              </div>
            </div>

            <div className="detail-box">
              <div className="detail-row">
                <span>Order Type</span>
                <span>{limitDirection}</span>
              </div>
              <div className="detail-row">
                <span>Execution</span>
                <span>Onchain settlement</span>
              </div>
              <div className="detail-row">
                <span>Estimated fee</span>
                <span>0.0018 ETH</span>
              </div>
            </div>

            <button className="primary-action">Create Limit Order</button>
          </div>

          <div className="limit-side-card">
            <div className="panel-heading">
              <h3>Order Summary</h3>
              <span className="green-text">READY</span>
            </div>

            <div className="summary-block">
              <div className="summary-row">
                <span>Sell</span>
                <strong>
                  {limitSellAmount || "0.0"} {limitSellToken}
                </strong>
              </div>
              <div className="summary-row">
                <span>Receive</span>
                <strong>
                  {limitBuyAmount || "0.0"} {limitBuyToken}
                </strong>
              </div>
              <div className="summary-row">
                <span>Trigger Price</span>
                <strong>
                  {limitPrice} {limitBuyToken}
                </strong>
              </div>
              <div className="summary-row">
                <span>Expiry</span>
                <strong>{limitExpiry}</strong>
              </div>
            </div>

            <div className="order-book-card">
              <h4>Terminal Notes</h4>
              <ul className="feed-list compact">
                <li>› Sushi-style order entry layout</li>
                <li>› Trigger-based execution flow</li>
                <li>› Clean wallet-first action card</li>
                <li>› Ready for smart-contract wiring</li>
              </ul>
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
                    <button
                      className="table-action-btn"
                      onClick={() => handleViewBond(bond)}
                    >
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
                <span className="bond-info-eyebrow">Selected eBond</span>
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

            {bondActionMessage && (
              <p className="swap-helper-text success">{bondActionMessage}</p>
            )}
          </div>
        )}

        <div className="bottom-grid marketplace-bottom">
          <div className="info-panel">
            <div className="panel-heading">
              <h3>Marketplace Feed</h3>
              <span className="green-text">LIVE</span>
            </div>
            <ul className="feed-list">
              <li>› New eBond listings streamed from Coffhee contracts</li>
              <li>› Bond ownership can be represented as ERC-1155 positions</li>
              <li>› Encrypted metadata available to authorized holders</li>
              <li>› Secondary-market bond discovery ready for UI wiring</li>
            </ul>
          </div>

          <div className="info-panel">
            <div className="panel-heading">
              <h3>Market Summary</h3>
              <span className="green-text">24H</span>
            </div>
            <div className="market-row">
              <span>Total Listings</span>
              <strong>148</strong>
            </div>
            <div className="market-row">
              <span>Avg. Yield</span>
              <strong>9.84%</strong>
            </div>
            <div className="market-row">
              <span>Volume</span>
              <strong>$1.84M</strong>
            </div>
          </div>
        </div>
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
                <select
                  value={eusdLockPeriod}
                  onChange={(e) => setEusdLockPeriod(e.target.value)}
                  className="config-input"
                >
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                  <option>180 Days</option>
                </select>
                <small>Longer lock periods can support stronger mint terms.</small>
              </div>

              <div className="config-card">
                <label>Estimated eUSD</label>
                <input
                  type="text"
                  value={eusdDepositAmount ? eusdDepositAmount : "0.0"}
                  readOnly
                  className="config-input"
                />
                <small>Preview assumes a simple 1:1 stablecoin mint ratio.</small>
              </div>
            </div>

            <div className="detail-box">
              <div className="detail-row">
                <span>Collateral Asset</span>
                <span>{eusdSourceToken}</span>
              </div>
              <div className="detail-row">
                <span>Vault</span>
                <span>eUSD Staking Contract</span>
              </div>
              <div className="detail-row">
                <span>Unlock Time</span>
                <span>{eusdLockPeriod}</span>
              </div>
            </div>

            <button className="primary-action">Lock & Mint eUSD</button>
          </div>

          <div className="info-panel eusd-side-panel">
            <div className="panel-heading">
              <h3>Vault Status</h3>
              <span className="green-text">ACTIVE</span>
            </div>
            <div className="summary-block">
              <div className="summary-row">
                <span>Accepted Collateral</span>
                <strong>USD.e / USDC / USDT</strong>
              </div>
              <div className="summary-row">
                <span>Mint Asset</span>
                <strong>eUSD</strong>
              </div>
              <div className="summary-row">
                <span>Redemption</span>
                <strong>After lock expiry</strong>
              </div>
              <div className="summary-row">
                <span>Contract Status</span>
                <strong>Ready to wire</strong>
              </div>
            </div>

            <ul className="feed-list compact">
              <li>› Stablecoin staking flow for eUSD issuance</li>
              <li>› Clean path for vault contract integration</li>
              <li>› Wallet balances and allowance checks can slot in here</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <div className="matrix-bg" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">C</div>
          <div>
            <h1>COFFHEE</h1>
            <p>Encrypted Bond Marketplace</p>
          </div>
        </div>

        <nav className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <button className="connect-btn" onClick={activeTab === "Swap" ? handleConnectWallet : undefined}>
          {wallet?.address
            ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </header>

      <main className="main-content">
        <section className="hero-panel single-column">
          <div className="hero-copy compact-hero">
            <span className="status-pill">SYSTEM ONLINE</span>
            <h2>{pageMeta.title}</h2>
            <p>{pageMeta.description}</p>
          </div>

          {activeTab === "Swap" && renderSwapSection()}
          {activeTab === "Limit" && renderLimitSection()}
          {activeTab === "Lend" && renderLendSection()}
          {activeTab === "eUSD" && renderEusdSection()}
        </section>
      </main>
    </div>
  );
}

export default App;
