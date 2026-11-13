'use client';

import { useEffect, useState } from 'react';
import { FaCopy, FaTimes } from 'react-icons/fa';
import { useChildPanel } from '@/components/child-panel/use-child-panel';

interface OwnedPanel {
  domain: string;
  status: string;
  createdAt?: string;
  expiryDate?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
};

const capital = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '-');

export default function CarbonChildPanel() {
  const {
    formData,
    isLoading,
    toast,
    setToast,
    currencies,
    childPanelPriceUSD,
    isDataLoading,
    nameservers,
    getPriceInCurrency,
    formatPrice,
    showToast,
    copyToClipboard,
    handleInputChange,
    handleSubmit,
  } = useChildPanel();

  const [panel, setPanel] = useState<OwnedPanel | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/child-panel/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data?.hasPanel && json.data.panel) setPanel(json.data.panel);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.domain.trim()) return showToast('Please enter your domain', 'error');
    if (!formData.username.trim()) return showToast('Please enter an admin username', 'error');
    if (formData.password.length < 6) return showToast('Password must be at least 6 characters', 'error');
    if (formData.password !== formData.passwordConfirm) return showToast('Passwords do not match', 'error');
    handleSubmit(event);
  };

  const servers = [nameservers.ns1, nameservers.ns2].filter(Boolean);
  const price = isDataLoading
    ? 'Loading…'
    : formatPrice(getPriceInCurrency(childPanelPriceUSD, formData.currency), formData.currency);

  return (
    <div className="cb-page cb-narrow cb-child-panel">
      {toast && (
        <div className={`cb-toast is-${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button type="button" aria-label="Close" onClick={() => setToast(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      {panel ? (
        <div className="cb-table-wrap">
          <table className="cb-table cb-table-compact cb-table-info">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Created</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{panel.domain}</td>
                <td>{capital(panel.status)}</td>
                <td>{formatDate(panel.createdAt)}</td>
                <td>{formatDate(panel.expiryDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cb-card">
          <form onSubmit={submit} className="cb-form" noValidate>
            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-cp-domain">
                Domain
              </label>
              <input
                id="cb-cp-domain"
                name="domain"
                className="cb-input"
                value={formData.domain}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </div>

            {servers.length > 0 && (
              <div className="cb-alert is-info">
                <div>Please change nameservers to:</div>
                {servers.map((server) => (
                  <div key={server} className="cb-ns">
                    <span>{server}</span>
                    <button
                      type="button"
                      className="cb-copy"
                      aria-label="Copy nameserver"
                      onClick={() => copyToClipboard(server, 'Nameserver copied!')}
                    >
                      <FaCopy />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-cp-currency">
                Currency
              </label>
              <select
                id="cb-cp-currency"
                name="currency"
                className="cb-input"
                value={formData.currency}
                onChange={handleInputChange}
                disabled={isDataLoading || currencies.length === 0}
              >
                {currencies.length === 0 ? (
                  <option value="">{isDataLoading ? 'Loading…' : 'No currencies available'}</option>
                ) : (
                  currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-cp-user">
                Admin username
              </label>
              <input
                id="cb-cp-user"
                name="username"
                className="cb-input"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-cp-pass">
                Admin password
              </label>
              <input
                id="cb-cp-pass"
                name="password"
                type="password"
                className="cb-input"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-cp-pass2">
                Confirm password
              </label>
              <input
                id="cb-cp-pass2"
                name="passwordConfirm"
                type="password"
                className="cb-input"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-cp-price">
                Price per month
              </label>
              <input id="cb-cp-price" className="cb-input cb-readonly" value={price} readOnly />
            </div>

            <button type="submit" className="cb-btn" disabled={isLoading}>
              {isLoading ? 'Submitting…' : 'Submit order'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
