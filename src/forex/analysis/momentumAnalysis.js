import { calculateRSISeries, rsiDivergence } from '../../indicators/rsi.js'
import { calculateMACD, histogramExpanding } from '../../indicators/macd.js'
import { isRising, isFalling } from '../../utils/math.js'

export function analyzeMomentum(closes) {
  const rsiSeries = calculateRSISeries(closes)
  const rsi = rsiSeries[rsiSeries.length - 1]
  const rsiRising = isRising(rsiSeries, 4)
  const rsiFalling = isFalling(rsiSeries, 4)
  const divergence = rsiDivergence(closes, rsiSeries)

  const { macdLine, signalLine, histogram } = calculateMACD(closes)
  const expanding = histogramExpanding(histogram)
  const lastHistogram = histogram[histogram.length - 1]

  let momentumBias = 'NEUTRAL'
  if (rsiRising && lastHistogram > 0) momentumBias = 'BULLISH'
  else if (rsiFalling && lastHistogram < 0) momentumBias = 'BEARISH'

  return {
    rsi,
    rsiRising,
    rsiFalling,
    divergence,
    macdHistogram: lastHistogram,
    histogramExpanding: expanding,
    momentumBias
  }
}
