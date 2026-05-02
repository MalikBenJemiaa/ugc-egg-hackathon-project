export const COINS_PER_DT = 10;

export function dtToCoins(dt: number) {
  return Math.round(dt * COINS_PER_DT);
}

export function coinsToDt(coins: number) {
  return coins / COINS_PER_DT;
}

export function withdrawalNetDtFromCoins(coins: number, commissionRate = 0.1) {
  const grossDT = coinsToDt(coins);
  const commissionDT = +(grossDT * commissionRate).toFixed(2);
  const netDT = +(grossDT - commissionDT).toFixed(2);
  return { grossDT, commissionDT, netDT };
}

