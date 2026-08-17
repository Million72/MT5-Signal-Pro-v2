// Display name -> real Deriv API symbol code.
// Deriv's ticks_history endpoint does NOT accept display names like
// 'VOL10' or plain forex tickers like 'EURUSD' — every symbol must be
// translated to its actual API code before being sent.
export const DERIV_SYMBOL_MAP = {
  // Volatility (synthetic) indices
  VOL10: 'R_10',
  VOL25: 'R_25',
  VOL50: 'R_50',
  VOL75: 'R_75',
  VOL100: 'R_100',
  'VOL10-1S': '1HZ10V',
  'VOL25-1S': '1HZ25V',
  'VOL50-1S': '1HZ50V',
  'VOL75-1S': '1HZ75V',
  'VOL100-1S': '1HZ100V',
  CRASH500: 'CRASH500N',
  CRASH1000: 'CRASH1000N',
  BOOM500: 'BOOM500N',
  BOOM1000: 'BOOM1000N',
  JUMP10: 'JD10',
  JUMP25: 'JD25',
  JUMP50: 'JD50',
  JUMP75: 'JD75',
  JUMP100: 'JD100',
  // Forex majors/crosses (Deriv requires the 'frx' prefix)
  EURUSD: 'frxEURUSD',
  GBPUSD: 'frxGBPUSD',
  USDJPY: 'frxUSDJPY',
  AUDUSD: 'frxAUDUSD',
  NZDUSD: 'frxNZDUSD',
  USDCAD: 'frxUSDCAD',
  USDCHF: 'frxUSDCHF',
  EURGBP: 'frxEURGBP',
  EURJPY: 'frxEURJPY',
  GBPJPY: 'frxGBPJPY'
}

export function toDerivSymbol(displaySymbol) {
  return DERIV_SYMBOL_MAP[displaySymbol] || displaySymbol
}

export const MARKETS = {
  synthetic: [
    'VOL10', 'VOL25', 'VOL50', 'VOL75', 'VOL100',
    'VOL10-1S', 'VOL25-1S', 'VOL50-1S', 'VOL75-1S', 'VOL100-1S',
    'CRASH500', 'CRASH1000', 'BOOM500', 'BOOM1000',
    'JUMP10', 'JUMP25', 'JUMP50'
  ],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP', 'EURJPY', 'GBPJPY']
}

export const ALL_MARKETS = [...MARKETS.synthetic, ...MARKETS.forex]

export const BOOM_CRASH_SYMBOLS = ['CRASH500', 'CRASH1000', 'BOOM500', 'BOOM1000']
export const JUMP_SYMBOLS = ['JUMP10', 'JUMP25', 'JUMP50']
export const VOLATILITY_SYMBOLS = ['VOL10', 'VOL25', 'VOL50', 'VOL75', 'VOL100']

export function marketCategory(symbol) {
  if (BOOM_CRASH_SYMBOLS.includes(symbol)) return 'boom_crash'
  if (JUMP_SYMBOLS.includes(symbol)) return 'jump'
  if (VOLATILITY_SYMBOLS.includes(symbol)) return 'volatility'
  if (MARKETS.forex.includes(symbol)) return 'forex'
  return 'unknown'
}

// Decimal precision for display — synthetic indices trade at very
// different scales from each other, so a single default is wrong.
export const SYNTHETIC_DECIMALS = {
  VOL10: 3, VOL25: 3, VOL50: 2, VOL75: 2, VOL100: 2,
  'VOL10-1S': 3, 'VOL25-1S': 3, 'VOL50-1S': 2, 'VOL75-1S': 2, 'VOL100-1S': 2,
  CRASH500: 2, CRASH1000: 2, BOOM500: 2, BOOM1000: 2,
  JUMP10: 2, JUMP25: 2, JUMP50: 2
}

export const FOREX_DECIMALS = {
  EURUSD: 5, GBPUSD: 5, AUDUSD: 5, NZDUSD: 5, USDCAD: 5, USDCHF: 5,
  EURGBP: 5, EURJPY: 3, GBPJPY: 3, USDJPY: 3
}

// Forex sessions in UTC hours, used by the session filter.
export const FOREX_SESSIONS = {
  sydney: { start: 21, end: 6 },
  tokyo: { start: 0, end: 9 },
  london: { start: 7, end: 16 },
  newYork: { start: 12, end: 21 }
}
