export const calculateRangePrice = (
  startMmr: number,
  endMmr: number,
  baseValue: number,
  coefficient: number
): number => {
  let totalValue = 0;

  for (let n: number = startMmr; n <= endMmr; n += 1) {
    const hundredNumber = Math.floor(n / 2500);

    const currentPricePerMMR = baseValue * Math.pow(coefficient, hundredNumber);

    totalValue += currentPricePerMMR;
  }

  return totalValue;
};

export const calculateRangeDays = (
  value: number[],
  baseMmrDays: number
): number => {
  const countMmr: number = value[1] - value[0];
  let totalValue: number = 0;

  for (let i: number = 0; i <= countMmr; i++) {
    totalValue += baseMmrDays;
  }

  return totalValue;
};
