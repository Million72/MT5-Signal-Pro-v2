import { calculateRSISeries } from '../../indicators/rsi.js'
import { calculateMACD, macdCrossover } from '../../indicators/macd.js'

// RSI is used as a ZONE check, not a hard block. Past bugs came from
// treating a specific RSI threshold as an absolute gate, which blocked
// valid signals. Here RSI only disqualifies at true overbought/oversold
// extremes; otherwise it's advisory alongside MACD.
export function momentumFilter(closes, direction) {
  const rsiSeries = calculateRSISeries(closes)
  const rsi = rsiSeries[rsiSeries.length - 1]
  const { macdLine, signalLine, histogram } = calculateMACD(closes)
  const cross = macdCrossover(macdLine, signalLine)
  const lastHistogram = histogram[histogram.length - 1]

  const rsiExtremeBlock =
    (direction === 'BUY' && rsi > 85) ||
    (direction === 'SELL' && rsi < 15)

  const macdSupports =
    (direction === 'BUY' && (lastHistogram > 0 || cross === 'BULLISH_CROSS')) ||
    (direction === 'SELL' && (lastHistogram < 0 || cross === 'BEARISH_CROSS'))

  return {
    rsi,
    macdSupports,
    rsiExtremeBlock,
    passed: !rsiExtremeBlock && macdSupports
  }
}
