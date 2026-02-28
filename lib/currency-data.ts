import { USD_DEFAULT } from '@/lib/currency-utils';

export const defaultCurrencies = [USD_DEFAULT];

export const defaultCurrencySettings = {
  defaultCurrency: 'USD',
  displayDecimals: 2,
  currencyPosition: 'left',
  thousandsSeparator: ',',
  decimalSeparator: '.',
};
export const formatCurrency = (
  amount: number,
  currencyCode: string,
  settings: any
) => {
  const currency = defaultCurrencies.find(c => c.code === currencyCode);
  if (!currency) return `${amount}`;

  const { symbol } = currency;
  const { displayDecimals, currencyPosition, thousandsSeparator, decimalSeparator } = settings;
  const parts = amount.toFixed(displayDecimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  const formattedAmount = parts.join(decimalSeparator);
  switch (currencyPosition) {
    case 'left':
      return `${symbol}${formattedAmount}`;
    case 'right':
      return `${formattedAmount}${symbol}`;
    case 'left_space':
      return `${symbol} ${formattedAmount}`;
    case 'right_space':
      return `${formattedAmount} ${symbol}`;
    default:
      return `${symbol}${formattedAmount}`;
  }
};
