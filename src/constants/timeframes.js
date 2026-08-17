export const TIMEFRAMES = [
  { value: '1m', label: '1M', seconds: 60 },
  { value: '5m', label: '5M', seconds: 300 },
  { value: '15m', label: '15M', seconds: 900 },
  { value: '30m', label: '30M', seconds: 1800 },
  { value: '1h', label: '1H', seconds: 3600 },
  { value: '4h', label: '4H', seconds: 14400 },
  { value: '1d', label: '1D', seconds: 86400 }
]

export const GRANULARITY_MAP = TIMEFRAMES.reduce((acc, tf) => {
  acc[tf.value] = tf.seconds
  return acc
}, {})

// Maps a signal (entry) timeframe to its higher-timeframe confirmation
// chain: HTF2 (macro bias) -> HTF1 (intermediate) -> LTF (entry trigger).
// This is the 3-timeframe cascade used by multiTimeframeAnalyzer.
export const MTF_CASCADE = {
  '1m': ['15m', '5m', '1m'],
  '5m': ['1h', '15m', '5m'],
  '15m': ['4h', '1h', '15m'],
  '30m': ['4h', '1h', '30m'],
  '1h': ['1d', '4h', '1h'],
  '4h': ['1d', '4h', '4h'],
  '1d': ['1d', '1d', '1d']
}
