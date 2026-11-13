'use client';

import Link from 'next/link';
import { FaExchangeAlt, FaTimes } from 'react-icons/fa';
import { useAddFunds } from '@/components/add-funds/use-add-funds';

function toastText(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'message' in message && typeof (message as any).message === 'string') {
    return (message as any).message;
  }
  return 'Something went wrong';
}

export default function CarbonAddFunds() {
  const {
    toastMessage,
    setToastMessage,
    isLoading,
    isPending,
    isSubmitting,
    isSubmittingRef,
    hasValidAmount,
    activeCurrency,
    toggleCurrency,
    rate,
    form,
    userSettings,
    amountUSDError,
    convertedAmountError,
    handleUSDChange,
    handleBDTChange,
    handleFormSubmit,
    formatNumber,
    formatAmount,
    totalAmount,
  } = useAddFunds();

  const usd = activeCurrency === 'USD';
  const effectiveRate = rate || 120;
  const minUSD = Number(userSettings?.minimumFundsToAddUSD || 0);
  const maxUSD = Number(userSettings?.maximumFundsToAddUSD || 0);
  const busy = isPending || isSubmitting;
  const other = usd ? 'BDT' : 'USD';
  const approx =
    totalAmount.currency === 'BDT'
      ? formatAmount(totalAmount.amount / effectiveRate, 'USD')
      : formatAmount(totalAmount.amount * effectiveRate, 'BDT');

  return (
    <div className="cb-page cb-narrow">
      {toastMessage && (
        <div className={`cb-toast is-${toastMessage.type || 'success'}`} role="status">
          <span>{toastText(toastMessage.message)}</span>
          <button type="button" aria-label="Close" onClick={() => setToastMessage(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-card">
        {isLoading ? (
          <div className="cb-skeleton">
            {[0, 1, 2].map((row) => (
              <div key={row} className="cb-skeleton-row" />
            ))}
          </div>
        ) : (
          <div className="cb-form">
            <div className="cb-field">
              <div className="cb-label-row">
                <label className="cb-label" htmlFor="cb-amount">
                  Amount ({activeCurrency})
                </label>
                <button type="button" className="cb-link" onClick={toggleCurrency} disabled={busy}>
                  <FaExchangeAlt /> Pay in {other}
                </button>
              </div>
              <div className="cb-affix">
                <span className="cb-affix-symbol">{usd ? '$' : '৳'}</span>
                <input
                  id="cb-amount"
                  className="cb-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={busy}
                  min={usd ? minUSD : minUSD * effectiveRate}
                  max={maxUSD > 0 ? (usd ? maxUSD : maxUSD * effectiveRate) : undefined}
                  value={(usd ? form.watch('amountUSD') : form.watch('amountBDT')) || ''}
                  onChange={usd ? handleUSDChange : handleBDTChange}
                />
              </div>
              {amountUSDError ? <small className="cb-hint is-error">{amountUSDError}</small> : null}
            </div>

            <div className="cb-field">
              <span className="cb-label">
                You {usd ? 'pay' : 'receive'} <span className="cb-label-note">(1 USD = {effectiveRate} BDT)</span>
              </span>
              <div className="cb-input cb-readonly">
                {usd
                  ? `৳ ${formatNumber(form.watch('amountBDTConverted') || '0.00')}`
                  : `$ ${formatNumber(form.watch('amountUSD') || '0.00')}`}
              </div>
              {convertedAmountError ? <small className="cb-hint is-error">{convertedAmountError}</small> : null}
            </div>

            <div className="cb-total">
              <span>Total</span>
              <strong>{formatAmount(totalAmount.amount, totalAmount.currency)}</strong>
              <small>≈ {approx}</small>
            </div>

            <button
              type="button"
              className="cb-btn"
              disabled={busy || !hasValidAmount || isSubmittingRef.current}
              onClick={(event) => {
                event.preventDefault();
                if (!isSubmittingRef.current && !isSubmitting) handleFormSubmit(event);
              }}
            >
              {busy ? 'Processing…' : 'Pay'}
            </button>
          </div>
        )}
      </div>

      <p className="cb-note">
        Payments are processed securely and credited to your balance right after they are confirmed.{' '}
        <Link href="/transactions" className="cb-link">
          View your transactions
        </Link>
      </p>
    </div>
  );
}
