export function computeRR(entry, stopLoss, takeProfit) {
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(takeProfit - entry)
  if (risk === 0) return 0
  return Number((reward / risk).toFixed(2))
}

export function positionSizeForRisk(accountBalance, riskPercent, entry, stopLoss) {
  const riskAmount = accountBalance * (riskPercent / 100)
  const perUnitRisk = Math.abs(entry - stopLoss)
  if (perUnitRisk === 0) return 0
  return Number((riskAmount / perUnitRisk).toFixed(4))
}

export function expectedValue(winRate, avgRR) {
  // EV per unit risked, assuming a 1R loss on losing trades
  const lossRate = 1 - winRate
  return Number((winRate * avgRR - lossRate).toFixed(3))
}
