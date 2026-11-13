'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FaPaperclip, FaSearch, FaTimes } from 'react-icons/fa';
import ReCAPTCHA from '@/components/recaptcha';
import { useNewTicket } from '@/components/support-tickets/use-new-ticket';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  answered: 'Answered',
  closed: 'Closed',
  pending: 'Pending',
  in_progress: 'In progress',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

export default function CarbonTickets() {
  const {
    isLoading,
    isSubmitting,
    formData,
    ticketTypes,
    aiSubcategories,
    ticketSubjects,
    subjectsLoading,
    handleTicketTypeChange,
    handleInputChange,
    handleOrderIdsChange,
    orderIdsError,
    showMessageField,
    showFileUpload,
    uploadingFiles,
    selectedFiles,
    handleFileUpload,
    removeSelectedFile,
    isEnabledForForm,
    recaptchaSettings,
    setRecaptchaToken,
    handleSubmit,
    tickets,
    ticketsLoading,
    searchQuery,
    setSearchQuery,
    toast,
    setToast,
  } = useNewTicket();

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter(
      (ticket) => String(ticket.id).includes(query) || (ticket.subject || '').toLowerCase().includes(query)
    );
  }, [tickets, searchQuery]);

  return (
    <div className="cb-page cb-narrow">
      {toast && (
        <div className={`cb-toast is-${toast.type || 'success'}`} role="status">
          <span>{toast.message}</span>
          <button type="button" aria-label="Close" onClick={() => setToast(null)}>
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
              <label className="cb-label" htmlFor="cb-ticket-type">
                Category
              </label>
              <select
                id="cb-ticket-type"
                className="cb-input"
                value={formData.ticketType}
                onChange={(event) => handleTicketTypeChange(event.target.value as 'Human' | 'AI')}
              >
                {ticketTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.value === 'AI' ? 'AI Support' : 'Human Support'}
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-ticket-sub">
                Subcategory
              </label>
              {formData.ticketType === 'AI' ? (
                <select
                  id="cb-ticket-sub"
                  className="cb-input"
                  value={formData.aiSubcategory}
                  onChange={(event) => handleInputChange('aiSubcategory', event.target.value)}
                >
                  {aiSubcategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="cb-ticket-sub"
                  className="cb-input"
                  value={formData.humanTicketSubject}
                  disabled={subjectsLoading}
                  onChange={(event) => handleInputChange('humanTicketSubject', event.target.value)}
                >
                  {subjectsLoading ? (
                    <option value="">Loading…</option>
                  ) : ticketSubjects.length === 0 ? (
                    <option value="">No subjects available</option>
                  ) : (
                    ticketSubjects.map((subject) => (
                      <option key={subject.id} value={String(subject.id)}>
                        {subject.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-ticket-orders">
                Order ID <span className="cb-label-note">(separate several with commas)</span>
              </label>
              <input
                id="cb-ticket-orders"
                className="cb-input"
                type="text"
                value={formData.orderIds}
                onChange={(event) => handleOrderIdsChange(event.target.value)}
              />
              {orderIdsError ? <small className="cb-hint is-error">{orderIdsError}</small> : null}
            </div>

            {showMessageField && (
              <div className="cb-field">
                <label className="cb-label" htmlFor="cb-ticket-message">
                  Message
                </label>
                <textarea
                  id="cb-ticket-message"
                  className="cb-input cb-textarea"
                  rows={7}
                  value={formData.message}
                  onChange={(event) => handleInputChange('message', event.target.value)}
                />
              </div>
            )}

            {showFileUpload && (
              <div className="cb-attach">
                <label htmlFor="cb-ticket-files" className="cb-link">
                  <FaPaperclip /> {uploadingFiles ? 'Uploading…' : 'Attach files'}
                </label>
                <input
                  id="cb-ticket-files"
                  type="file"
                  multiple
                  accept="image/*"
                  hidden
                  disabled={uploadingFiles || isSubmitting}
                  onChange={handleFileUpload}
                />
                {selectedFiles.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="cb-file">
                    {file.name}
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeSelectedFile(index)}>
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {isEnabledForForm('supportTicket') && recaptchaSettings ? (
              <ReCAPTCHA
                siteKey={recaptchaSettings.siteKey}
                version={recaptchaSettings.version}
                action="supportTicket"
                threshold={recaptchaSettings.threshold}
                onVerify={(token) => setRecaptchaToken(token)}
                onError={() => setRecaptchaToken(null)}
                onExpired={() => setRecaptchaToken(null)}
              />
            ) : null}

            <button type="button" className="cb-btn" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        )}
      </div>

      <div className="cb-card cb-toolbar">
        <div className="cb-searchbar">
          <input
            type="search"
            className="cb-input"
            placeholder="Search"
            autoComplete="off"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <span className="cb-searchbar-btn" aria-hidden="true">
            <FaSearch />
          </span>
        </div>
      </div>

      <div className="cb-table-wrap">
        <table className="cb-table cb-table-compact">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Last update</th>
            </tr>
          </thead>
          <tbody>
            {ticketsLoading && visible.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="cb-skeleton-row cb-skeleton-line" />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="cb-empty">
                  {searchQuery.trim() ? 'No tickets match your search.' : 'You have no tickets yet.'}
                </td>
              </tr>
            ) : (
              visible.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>
                    <Link href={`/support-tickets/${ticket.id}`} className="cb-link">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td>{STATUS_LABEL[ticket.status] || ticket.status}</td>
                  <td>{formatDate(ticket.updatedAt || ticket.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
