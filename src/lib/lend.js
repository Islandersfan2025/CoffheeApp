import { ethers } from "ethers";

/**
 * Network addresses from the repo README.
 * Switch these if you want to point to a different deployment.
 */
export const CONTRACTS = {
  arbitrum: {
    chainId: 42161,
    marketplace: "0x59De9918eE0cba2a60368104C289bE9EB8973E34",
    cappucino: "0x880fe78C2E1bd0Ac2c6580Dc99f47C29107d9884",
  },
  robinhood: {
    marketplace: "0xB9B956A6F0AD75f5dB0da742c3520b28b90a9935",
    cappucino: "0xaFD717461069733CB63644A1497874A196505Bfe",
  },
};

/**
 * Minimal ABI for the Lend / eBond marketplace section
 */
export const MARKETPLACE_ABI = [
  "function nextListingId() view returns (uint256)",
  "function listings(uint256) view returns (address seller, address tokenContract, uint256 tokenId, uint256 amount, uint256 pricePerUnit, bool active)",
  "function buy(uint256 listingId, uint256 amount) payable",
  "function cancel(uint256 listingId)",
  "event Listed(uint256 indexed listingId, address indexed seller, address indexed tokenContract, uint256 tokenId, uint256 amount, uint256 pricePerUnit)",
  "event Purchased(uint256 indexed listingId, address indexed buyer, uint256 amount)",
  "event Cancelled(uint256 indexed listingId)",
];

export const CAPPUCINO_ABI = [
  "function wrappedBonds(uint256 tokenId) view returns (uint256 classId, uint256 nonce, uint256 amount)",
  "function uri(uint256 tokenId) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
];

function getWindowEthereum() {
  if (!window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask or another EVM wallet.");
  }
  return window.ethereum;
}

export async function getBrowserProvider() {
  const ethereum = getWindowEthereum();
  return new ethers.BrowserProvider(ethereum);
}

export async function requestWallet() {
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

export function getContracts(providerOrSigner, networkKey = "arbitrum") {
  const config = CONTRACTS[networkKey];

  const marketplace = new ethers.Contract(
    config.marketplace,
    MARKETPLACE_ABI,
    providerOrSigner
  );

  const cappucino = new ethers.Contract(
    config.cappucino,
    CAPPUCINO_ABI,
    providerOrSigner
  );

  return { marketplace, cappucino, config };
}

export function formatEth(value) {
  return ethers.formatEther(value);
}

export function parseEth(value) {
  return ethers.parseEther(String(value || "0"));
}

export async function fetchMarketplaceListings(provider, networkKey = "arbitrum") {
  const { marketplace, cappucino, config } = getContracts(provider, networkKey);

  const nextListingId = await marketplace.nextListingId();
  const total = Number(nextListingId);

  const listingCalls = [];
  for (let i = 0; i < total; i += 1) {
    listingCalls.push(marketplace.listings(i));
  }

  const rawListings = await Promise.all(listingCalls);

  const enriched = await Promise.all(
    rawListings.map(async (listing, index) => {
      const isCappucino =
        listing.tokenContract.toLowerCase() === config.cappucino.toLowerCase();

      let wrappedBond = null;
      let tokenUri = null;

      if (isCappucino) {
        try {
          const wb = await cappucino.wrappedBonds(listing.tokenId);
          wrappedBond = {
            classId: wb.classId.toString(),
            nonce: wb.nonce.toString(),
            amount: wb.amount.toString(),
          };
        } catch (err) {
          console.warn(`wrappedBonds(${listing.tokenId}) failed`, err);
        }

        try {
          tokenUri = await cappucino.uri(listing.tokenId);
        } catch (err) {
          console.warn(`uri(${listing.tokenId}) failed`, err);
        }
      }

      return {
        listingId: index,
        seller: listing.seller,
        tokenContract: listing.tokenContract,
        tokenId: listing.tokenId.toString(),
        amount: listing.amount.toString(),
        pricePerUnitWei: listing.pricePerUnit.toString(),
        pricePerUnitEth: formatEth(listing.pricePerUnit),
        active: listing.active,
        isCappucino,
        wrappedBond,
        tokenUri,
      };
    })
  );

  return enriched.filter((item) => item.active);
}

export async function buyListing({
  signer,
  listingId,
  amount,
  pricePerUnitWei,
  networkKey = "arbitrum",
}) {
  const { marketplace } = getContracts(signer, networkKey);

  const qty = BigInt(amount);
  const unitPrice = BigInt(pricePerUnitWei);
  const totalPrice = qty * unitPrice;

  const tx = await marketplace.buy(listingId, qty, {
    value: totalPrice,
  });

  const receipt = await tx.wait();
  return receipt;
}

export async function cancelListing({
  signer,
  listingId,
  networkKey = "arbitrum",
}) {
  const { marketplace } = getContracts(signer, networkKey);
  const tx = await marketplace.cancel(listingId);
  const receipt = await tx.wait();
  return receipt;
}

export async function fetchUserCappucinoBalances(
  provider,
  userAddress,
  tokenIds,
  networkKey = "arbitrum"
) {
  const { cappucino } = getContracts(provider, networkKey);

  const balances = await Promise.all(
    tokenIds.map(async (tokenId) => {
      const bal = await cappucino.balanceOf(userAddress, tokenId);
      return {
        tokenId: String(tokenId),
        balance: bal.toString(),
      };
    })
  );

  return balances;
}