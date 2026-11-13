'use client';

import { FaTimes } from 'react-icons/fa';
import { PriceDisplay } from '@/components/price-display';
import { useMassOrder } from '@/components/mass-orders/use-mass-order';

export default function CarbonMassOrder() {
  const {
    isAccessCheckLoading,
    massOrderEnabled,
    isFormLoading,
    orders,
    setOrders,
    parseOrders,
    handleSubmit,
    isSubmitting,
    isValidating,
    validationResult,
    validationErrors,
    balanceCheck,
    formatCurrency,
    toastMessage,
    setToastMessage,
  } = useMassOrder();

  if (isAccessCheckLoading || !massOrderEnabled) return null;

  const valid = validationResult?.validOrders.length || 0;
  const invalid = validationResult?.invalidOrders.length || 0;
  const short = !!balanceCheck && !balanceCheck.sufficient;
  const label = isSubmitting
    ? 'Processing…'
    : isValidating
    ? 'Validating…'
    : short
    ? 'Insufficient balance'
    : valid > 0
    ? `Submit ${valid} order${valid === 1 ? '' : 's'}`
    : 'Submit';

  return (
    <div className="cb-page cb-narrow">
      {toastMessage && (
        <div className={`cb-toast is-${toastMessage.type || 'success'}`} role="status">
          <span>{String(toastMessage.message)}</span>
          <button type="button" aria-label="Close" onClick={() => setToastMessage(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-card">
        {isFormLoading ? (
          <div className="cb-skeleton">
            <div className="cb-skeleton-row cb-skeleton-tall" />
            <div className="cb-skeleton-row" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="cb-form">
            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-mass">
                One order per line in format
              </label>
              <textarea
                id="cb-mass"
                className="cb-input cb-textarea"
                rows={7}
                placeholder="service_id | link | quantity"
                value={orders}
                onChange={(event) => {
                  setOrders(event.target.value);
                  parseOrders(event.target.value);
                }}
              />
              {validationResult && (valid > 0 || invalid > 0) ? (
                <small className={`cb-hint ${valid === 0 ? 'is-error' : ''}`}>
                  {valid} valid, {invalid} invalid
                </small>
              ) : null}
            </div>

            {validationErrors.length > 0 && (
              <div className="cb-alert is-error">
                {validationErrors.slice(0, 3).map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
                {validationErrors.length > 3 ? <div>+{validationErrors.length - 3} more errors</div> : null}
              </div>
            )}

            {validationResult && valid > 0 && (
              <div className="cb-total">
                <span>Total cost</span>
                <strong>{formatCurrency(validationResult.totalCostInUserCurrency)}</strong>
                {balanceCheck ? (
                  <small>
                    Balance: <PriceDisplay amount={balanceCheck.available} originalCurrency="USD" />
                  </small>
                ) : null}
              </div>
            )}

            <button type="submit" className="cb-btn" disabled={valid === 0 || isSubmitting || isValidating || short}>
              {label}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
