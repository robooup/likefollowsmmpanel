'use client';

import { FaSearch, FaSync, FaTimes } from 'react-icons/fa';
import CancelOrderModal from '@/components/dashboard/my-orders/modals/cancel-order';
import RequestRefillModal from '@/components/dashboard/my-orders/modals/request-refill';
import OrderTable from '@/components/dashboard/my-orders/order-table';
import { useOrdersList } from '@/components/my-orders/use-orders-list';

function toastText(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'message' in message && typeof (message as any).message === 'string') {
    return (message as any).message;
  }
  return 'Something went wrong';
}

const PAGE_SIZES = [10, 25, 50, 100, 200, 500];

export default function CarbonOrders() {
  const {
    status,
    statusFilters,
    getStatusCount,
    handleStatusChange,
    search,
    setSearch,
    isSearchLoading,
    limit,
    handleLimitChange,
    pagination,
    handleRefresh,
    refreshing,
    isLoading,
    orders,
    error,
    formatDate,
    formatTime,
    getStatusBadge,
    formatStatusDisplay,
    localPendingCancelRequests,
    cancelModal,
    setCancelModal,
    refillModal,
    setRefillModal,
    handleCancelClose,
    handleCancelConfirm,
    handleRefillClose,
    handleRefillConfirm,
    toastMessage,
    setToastMessage,
    totalPages,
    page,
    handlePrevious,
    handleNext,
  } = useOrdersList();

  return (
    <div className="cb-page">
      <CancelOrderModal
        isOpen={cancelModal.isOpen}
        onClose={handleCancelClose}
        onConfirm={handleCancelConfirm}
        orderId={cancelModal.orderId}
        reason={cancelModal.reason}
        setReason={(reason) => setCancelModal((prev) => ({ ...prev, reason }))}
        isLoading={cancelModal.isLoading || false}
      />
      <RequestRefillModal
        isOpen={refillModal.isOpen}
        onClose={handleRefillClose}
        onConfirm={handleRefillConfirm}
        orderId={refillModal.orderId}
        reason={refillModal.reason}
        setReason={(reason) => setRefillModal((prev) => ({ ...prev, reason }))}
        isLoading={refillModal.isLoading}
      />
      {toastMessage && (
        <div className={`cb-toast is-${toastMessage.type || 'success'}`} role="status">
          <span>{toastText(toastMessage.message)}</span>
          <button type="button" aria-label="Close" onClick={() => setToastMessage(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-tabs" role="tablist">
        {statusFilters.map((filter: any) => {
          const count = getStatusCount(filter.key);
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={status === filter.key}
              className={`cb-tab ${status === filter.key ? 'is-active' : ''}`}
              onClick={() => handleStatusChange(filter.key)}
            >
              {filter.label}
              {count > 0 ? <span className="cb-tab-count">{count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="cb-card cb-toolbar">
        <div className="cb-searchbar">
          <input
            type="search"
            className="cb-input"
            placeholder="Search"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className={`cb-searchbar-btn ${isSearchLoading ? 'is-busy' : ''}`} aria-hidden="true">
            <FaSearch />
          </span>
        </div>
        <select
          className="cb-input cb-toolbar-select"
          aria-label="Orders per page"
          value={limit === 999999 ? 'all' : String(limit)}
          onChange={(event) => handleLimitChange(event.target.value)}
        >
          {PAGE_SIZES.filter((size) => size === 10 || pagination.total >= size).map((size) => (
            <option key={size} value={String(size)}>
              {size} per page
            </option>
          ))}
          <option value="all">Show all</option>
        </select>
        <button
          type="button"
          className="cb-btn cb-btn-icon"
          title="Refresh"
          aria-label="Refresh"
          disabled={refreshing || isLoading}
          onClick={handleRefresh}
        >
          <FaSync className={refreshing || isLoading ? 'cb-spin' : ''} />
        </button>
      </div>

      <div className="cb-card cb-table-card">
        <OrderTable
          orders={orders}
          isLoading={isLoading}
          error={error}
          formatDate={formatDate}
          formatTime={formatTime}
          getStatusBadge={getStatusBadge}
          formatStatusDisplay={formatStatusDisplay}
          localPendingCancelRequests={localPendingCancelRequests}
          onOpenRefillModal={(orderId) => setRefillModal({ isOpen: true, orderId, reason: '', isLoading: false })}
          onOpenCancelModal={(orderId) => setCancelModal({ isOpen: true, orderId, reason: '', isLoading: false })}
          totalPages={totalPages}
          page={page}
          pagination={pagination}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
