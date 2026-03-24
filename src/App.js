import React, { useMemo, useState } from "react";
import "./App.css";

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
  },
  {
    id: "EBOND-002",
    name: "Espresso Yield Note",
    maturity: "180 Days",
    apr: "10.15%",
    price: "$93.10",
    supply: "820",
    collateral: "USD.e",
  },
  {
    id: "EBOND-003",
    name: "Latte Treasury Strip",
    maturity: "365 Days",
    apr: "12.60%",
    price: "$88.75",
    supply: "410",
    collateral: "USDT",
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("Swap");

  const [swapFromToken, setSwapFromToken] = useState("FRAP");
  const [swapToToken, setSwapToToken] = useState("USDC");
  const [swapFromAmount, setSwapFromAmount] = useState("");
  const [swapToAmount, setSwapToAmount] = useState("");

  const [limitSellToken, setLimitSellToken] = useState("ETH");
  const [limitBuyToken, setLimitBuyToken] = useState("FRAP");
  const [limitSellAmount, setLimitSellAmount] = useState("");
  const [limitBuyAmount, setLimitBuyAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("2450.00");
  const [limitExpiry, setLimitExpiry] = useState("7 Days");
  const [limitDirection, setLimitDirection] = useState("Buy when below");

  const [eusdSourceToken, setEusdSourceToken] = useState("USDC");
  const [eusdDepositAmount, setEusdDepositAmount] = useState("");
  const [eusdLockPeriod, setEusdLockPeriod] = useState("30 Days");

  const pageMeta = useMemo(() => {
    switch (activeTab) {
      case "Swap":
        return {
          title: "Encrypted Token Swap",
          description:
            "Swap Frappucino, bond assets, and stablecoins with a privacy-first terminal inspired by elite onchain trading interfaces.",
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

  const handleSwapFlip = () => {
    setSwapFromToken(swapToToken);
    setSwapToToken(swapFromToken);
    setSwapFromAmount(swapToAmount);
    setSwapToAmount(swapFromAmount);
  };

  const renderSwapSection = () => {
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
            <button className="mini-link">Settings</button>
          </div>

          <div className="token-panel">
            <div className="token-panel-header">
              <span>You pay</span>
              <span>Balance: 124.82</span>
            </div>
            <div className="token-row">
              <input
                type="number"
                placeholder="0.0"
                value={swapFromAmount}
                onChange={(e) => setSwapFromAmount(e.target.value)}
                className="amount-input"
              />
              <button className="token-select">{swapFromToken}</button>
            </div>
          </div>

          <button className="flip-btn" onClick={handleSwapFlip}>
            ⇅
          </button>

          <div className="token-panel">
            <div className="token-panel-header">
              <span>You receive</span>
              <span>Balance: 4,921.14</span>
            </div>
            <div className="token-row">
              <input
                type="number"
                placeholder="0.0"
                value={swapToAmount}
                onChange={(e) => setSwapToAmount(e.target.value)}
                className="amount-input"
              />
              <button className="token-select">{swapToToken}</button>
            </div>
          </div>

          <div className="detail-box">
            <div className="detail-row">
              <span>Route</span>
              <span>FRAP → xBond → {swapToToken}</span>
            </div>
            <div className="detail-row">
              <span>Network fee</span>
              <span>0.0021 ETH</span>
            </div>
            <div className="detail-row">
              <span>Encrypted message</span>
              <span>Owner-only</span>
            </div>
          </div>

          <button className="primary-action">Execute Swap</button>
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
                <small>1 {limitSellToken} = {limitPrice} {limitBuyToken}</small>
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
                <strong>{limitSellAmount || "0.0"} {limitSellToken}</strong>
              </div>
              <div className="summary-row">
                <span>Receive</span>
                <strong>{limitBuyAmount || "0.0"} {limitBuyToken}</strong>
              </div>
              <div className="summary-row">
                <span>Trigger Price</span>
                <strong>{limitPrice} {limitBuyToken}</strong>
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
                    <button className="table-action-btn">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

        <button className="connect-btn">Connect Wallet</button>
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