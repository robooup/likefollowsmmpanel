'use client';

import { useEffect } from 'react';
import { FaCopy, FaTimes } from 'react-icons/fa';
import ActivateAffiliateContent from '@/app/(panel)/(protected)/affiliate/activate/page';
import { RequestWithdrawalModal } from '@/components/dashboard/affiliate/request-withdrawal';
import { PriceDisplay } from '@/components/price-display';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import { useAffiliate } from '@/components/affiliate/use-affiliate';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value || '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
};

const capital = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '-');

export default function CarbonAffiliate() {
  const { appName } = useAppNameWithFallback();
  const a = useAffiliate();

  useEffect(() => {
    setPageTitle('Affiliates', appName);
  }, [appName]);

  if (a.isActive === null) {
    return (
      <div className="cb-page cb-narrow">
        <div className="cb-card">
          <div className="cb-skeleton">
            <div className="cb-skeleton-row" />
            <div className="cb-skeleton-row" />
          </div>
        </div>
      </div>
    );
  }

  if (!a.isActive) return <ActivateAffiliateContent />;

  const { stats } = a;

  return (
    <div className="cb-page cb-narrow cb-affiliate">
      {a.toast && (
        <div className={`cb-toast is-${a.toast.type}`} role="status">
          <span>{a.toast.message}</span>
          <button type="button" aria-label="Close" onClick={() => a.setToast(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-table-wrap">
        <table className="cb-table cb-table-compact cb-table-info">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Referral link</th>
              <th>Commission rate</th>
              <th>Minimum payout</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="cb-ref-link">{a.referralLink || '-'}</span>
                {a.referralLink ? (
                  <button type="button" className="cb-copy" aria-label="Copy referral link" onClick={a.copyReferralLink}>
                    <FaCopy />
                  </button>
                ) : null}
              </td>
              <td>{stats.commissionRate}</td>
              <td>{stats.minimumPayout}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="cb-table-wrap">
        <table className="cb-table cb-table-compact cb-table-info">
          <thead>
            <tr>
              <th>Visits</th>
              <th>Registrations</th>
              <th>Referrals</th>
              <th>Conversion rate</th>
              <th>Total earnings</th>
              <th>Available earnings</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{stats.visits}</td>
              <td>{stats.registrations}</td>
              <td>{stats.referrals}</td>
              <td>{stats.conversionRate}</td>
              <td>{stats.totalEarnings}</td>
              <td>{stats.availableEarnings}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="cb-actions">
        <button type="button" className="cb-btn cb-btn-auto" onClick={() => a.setWithdrawalModalOpen(true)}>
          Request payout
        </button>
        <button
          type="button"
          className="cb-btn cb-btn-auto cb-btn-ghost"
          onClick={() => a.router.push('/affiliate/withdrawal-methods')}
        >
          Payout methods
        </button>
      </div>

      <div className="cb-table-wrap">
        <table className="cb-table cb-table-compact cb-table-info">
          <thead>
            <tr>
              <th>Payout date</th>
              <th>Payout amount</th>
              <th>Payout status</th>
            </tr>
          </thead>
          <tbody>
            {a.payouts.length === 0 ? (
              <tr>
                <td colSpan={3}>&nbsp;</td>
              </tr>
            ) : (
              a.payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{formatDate(payout.createdAt)}</td>
                  <td>
                    <PriceDisplay amount={payout.amount} originalCurrency="USD" />
                  </td>
                  <td>{capital(payout.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {a.earnings.length > 0 && (
        <div className="cb-table-wrap">
          <table className="cb-table cb-table-compact cb-table-info">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {a.earnings.map((earning) => (
                <tr key={earning.id}>
                  <td>{formatDate(earning.signupDate)}</td>
                  <td>{earning.user?.username || earning.user?.name || '-'}</td>
                  <td>{earning.service || '-'}</td>
                  <td>
                    <PriceDisplay amount={earning.amount} originalCurrency="USD" />
                  </td>
                  <td>
                    <PriceDisplay amount={earning.commission} originalCurrency="USD" />
                  </td>
                  <td>{capital(earning.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RequestWithdrawalModal
        isOpen={a.withdrawalModalOpen}
        onClose={() => a.setWithdrawalModalOpen(false)}
        withdrawalForm={a.withdrawalForm}
        setWithdrawalForm={a.setWithdrawalForm}
        withdrawalProcessing={a.withdrawalProcessing}
        availableBalance={a.availableBalance}
        availableBalanceDisplay={a.availableBalanceDisplay}
        minWithdrawalValue={a.minWithdrawalValue}
        savedWithdrawalMethods={a.savedWithdrawalMethods}
        getWithdrawalMethodDisplayName={a.getWithdrawalMethodDisplayName}
        getWithdrawalMethodOptionLabel={a.getWithdrawalMethodOptionLabel}
        isWithdrawalFormValid={a.isWithdrawalFormValid}
        onWithdrawalRequest={a.handleWithdrawalRequest}
      />
    </div>
  );
}
