export enum SupportedChainId {
  MAINNET = 1,
  BSC = 56,
  AVAX = 43114,
  ARBI = 43621,
  BASE = 8453,
  GOERLI = 5,
  SEPOLIA = 11155111,
  FUJI = 43113,
  HEX_MAINNET = '0x1',
  HEX_BSC = '0x38',
  HEX_AVAX = '0xa86a',
  HEX_ARBI = '0xa4b1',
  HEX_BASE = '0x2105',
  HEX_GOERLI = '0xaa36a7',
  HEX_SEPOLIA = '0xaa36a7',
  HEX_FUJI = '0xa869',
}

type AddressMap = { [chainId: number]: string }

export const USDC_ADDRESS: AddressMap = {
  [SupportedChainId.GOERLI]: '',
  [SupportedChainId.SEPOLIA]: '0xB88b5F025382AaDaC2F87A01f950223e7Ee68a1b',
  [SupportedChainId.FUJI]: '0xD7df0E1B0ee1618638aAE3DD34B869eCA4660D13',
}

export const WONKA_ADDRESS: AddressMap = {
  [SupportedChainId.GOERLI]: '',
  [SupportedChainId.SEPOLIA]: '0x9848422A708960e6f416f719006328077Ad1816A',
  [SupportedChainId.FUJI]: '0x9c73CF53819E7fE7933950db8EBa83a1fB3b8f54',
}

export const PRESALE_ADDRESS: AddressMap = {
  [SupportedChainId.GOERLI]: '',
  [SupportedChainId.SEPOLIA]: '0x7BB337ADE0cb6Ed0E6A77886Df8C17D66c5E738c',
  [SupportedChainId.FUJI]: '0x57F7DA21Fb0a2d9AC90C066cA52A4af0f1339c06',
}

export const LZEndpointAddress: AddressMap = {
  [SupportedChainId.GOERLI]: '',
  [SupportedChainId.SEPOLIA]: '0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1',
  [SupportedChainId.FUJI]: '0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706',
}

export const chainId = SupportedChainId.SEPOLIA

// {
//   "ethereum": "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
//   "bsc": "0x3c2269811836af69497E5F486A85D7316753cf62",
//   "avalanche": "0x3c2269811836af69497E5F486A85D7316753cf62",
//   "polygon": "0x3c2269811836af69497E5F486A85D7316753cf62",
//   "arbitrum": "0x3c2269811836af69497E5F486A85D7316753cf62",
//   "optimism": "0x3c2269811836af69497E5F486A85D7316753cf62",
//   "fantom": "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",

//   "goerli": "0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23",
//   "bsc-testnet": "0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1",
//   "fuji": "0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706",
//   "mumbai": "0xf69186dfBa60DdB133E91E9A4B5673624293d8F8",
//   "arbitrum-goerli": "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab",
//   "optimism-goerli": "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
//   "fantom-testnet": "0x7dcAD72640F835B0FA36EFD3D6d3ec902C7E5acf",
//   "meter-testnet": "0x3De2f3D1Ac59F18159ebCB422322Cb209BA96aAD",
//   "zksync-testnet": "0x093D2CF57f764f09C3c2Ac58a42A2601B8C79281"
// }

