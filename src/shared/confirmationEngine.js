// Combines the outputs of the multi-timeframe cascade and entry-model
// detectors into one confirmation object. Entry models are a HARD GATE,
// not a bonus — a signal with zero entry models present is rejected,
// matching the fix applied after live testing found signals firing
// without any entry model behind them.

export function buildConfirmation({ htfBias, ltfBias, entryModels = [], structureFilterPassed = true }) {
  const htfAligned = htfBias !== 'NEUTRAL' && htfBias === ltfBias
  const entryModelConfirmed = entryModels.length > 0
  const direction = htfAligned ? htfBias : 'NEUTRAL'

  return {
    direction,
    htfAligned,
    entryModelConfirmed,
    entryModels,
    structureFilterPassed,
    // A signal is only "confirmed" if every gate passes — no bonus scoring
    confirmed: htfAligned && entryModelConfirmed && structureFilterPassed && direction !== 'NEUTRAL'
  }
}

export function detectConflict(entryModels) {
  // If entry models disagree on direction (e.g. a bullish BOS and a
  // bearish liquidity sweep both fired), that's a conflict — reject.
  const directions = new Set(entryModels.map((m) => m.direction))
  return directions.size > 1
}
