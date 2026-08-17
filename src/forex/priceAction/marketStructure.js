// Detects swing highs and swing lows using a fractal (N-bar pivot) method.
// A swing high at index i means highs[i] is higher than `strength` bars
// on both sides; symmetric for swing lows.

export function findSwingPoints(highs, lows, strength = 3) {
  const swingHighs = []
  const swingLows = []

  for (let i = strength; i < highs.length - strength; i++) {
    let isHigh = true
    let isLow = true

    for (let j = 1; j <= strength; j++) {
      if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) isHigh = false
      if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) isLow = false
    }

    if (isHigh) swingHighs.push({ index: i, price: highs[i] })
    if (isLow) swingLows.push({ index: i, price: lows[i] })
  }

  return { swingHighs, swingLows }
}

export function nearestSwingLevels(highs, lows, currentIndex, strength = 3) {
  const { swingHighs, swingLows } = findSwingPoints(highs, lows, strength)
  const priorHighs = swingHighs.filter((s) => s.index < currentIndex)
  const priorLows = swingLows.filter((s) => s.index < currentIndex)

  return {
    nearestSwingHigh: priorHighs.length ? priorHighs[priorHighs.length - 1].price : null,
    nearestSwingLow: priorLows.length ? priorLows[priorLows.length - 1].price : null
  }
}

// Determines overall structure bias from the sequence of recent swings:
// higher highs + higher lows = bullish structure, and vice versa.
export function structureBias(swingHighs, swingLows) {
  if (swingHighs.length < 2 || swingLows.length < 2) return 'NEUTRAL'

  const lastTwoHighs = swingHighs.slice(-2)
  const lastTwoLows = swingLows.slice(-2)

  const higherHighs = lastTwoHighs[1].price > lastTwoHighs[0].price
  const higherLows = lastTwoLows[1].price > lastTwoLows[0].price
  const lowerHighs = lastTwoHighs[1].price < lastTwoHighs[0].price
  const lowerLows = lastTwoLows[1].price < lastTwoLows[0].price

  if (higherHighs && higherLows) return 'BULLISH'
  if (lowerHighs && lowerLows) return 'BEARISH'
  return 'NEUTRAL'
}
  
