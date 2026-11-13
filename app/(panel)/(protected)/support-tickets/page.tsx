'use client';

import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
    FaCheckCircle,
    FaClock,
    FaCreditCard,
    FaInfoCircle,
    FaPaperclip,
    FaTicketAlt,
    FaTimes,
} from 'react-icons/fa';
import ReCAPTCHA from '@/components/recaptcha';
import useReCAPTCHA from '@/hooks/useReCAPTCHA';
import TicketSystemGuard from '@/components/ticket-system-guard';

const Toast = ({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'info' | 'pending';
  onClose: () => void;
}) => (
  <div className={`toast toast-${type} toast-enter`}>
    {type === 'success' && <FaCheckCircle className="toast-icon" />}
    <span className="font-medium">{message}</span>
    <button onClick={onClose} className="toast-close">
      <FaTimes className="toast-close-icon" />
    </button>
  </div>
);

interface TicketFormData {
  category: string;
  subcategory: string;
  ticketType: 'Human' | 'AI';
  aiSubcategory: string;
  humanTicketSubject: string;
  orderIds: string;
  message: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  attachments: string[];
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'answered' | 'closed' | 'pending' | 'in_progress';
  category: string;
  subcategory?: string;
  message: string;
  orderIds?: string[];
  priority: 'low' | 'medium' | 'high';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  adminReply?: string;
  repliedAt?: string;
  repliedBy?: string;
}
import { useNewTicket } from '@/components/support-tickets/use-new-ticket';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonTickets from '@/components/themes/carbon/tickets';

const TicketPage: React.FC = () => {
  const {
    router,
    appName,
    activeTab,
    setActiveTab,
    isSubmitting,
    setIsSubmitting,
    isLoading,
    setIsLoading,
    formData,
    setFormData,
    showMessageField,
    setShowMessageField,
    showFileUpload,
    setShowFileUpload,
    searchQuery,
    setSearchQuery,
    toast,
    setToast,
    openAccordion,
    setOpenAccordion,
    orderIdsError,
    setOrderIdsError,
    uploadingFiles,
    setUploadingFiles,
    selectedFiles,
    setSelectedFiles,
    recaptchaToken,
    setRecaptchaToken,
    recaptchaSettings,
    isEnabledForForm,
    tickets,
    setTickets,
    ticketsLoading,
    setTicketsLoading,
    ticketSubjects,
    setTicketSubjects,
    subjectsLoading,
    setSubjectsLoading,
    fetchTickets,
    fetchTicketSubjects,
    ticketTypes,
    categories,
    subcategories,
    aiSubcategories,
    showToast,
    handleTicketTypeChange,
    handleInputChange,
    handleOrderIdsChange,
    handleFileUpload,
    removeSelectedFile,
    handleSubmit,
    getStatusBadge,
    handleticketsHistoryClick,
    toggleAccordion,
  } = useNewTicket();

  return (
    <div className="page-container">
      <div className="toast-container">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>

      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card" style={{ padding: '8px' }}>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm ${
                    activeTab === 'new'
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 hover:text-purple-600 dark:hover:from-gray-800 dark:hover:to-purple-900/30 dark:hover:text-purple-400'
                  }`}
                >
                  <FaTicketAlt className="mr-2 w-4 h-4" />
                  New Ticket
                </button>
                <button
                  onClick={handleticketsHistoryClick}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 hover:text-purple-600 dark:hover:from-gray-800 dark:hover:to-purple-900/30 dark:hover:text-purple-400"
                >
                  <FaClock className="mr-2 w-4 h-4" />
                  Tickets History
                </button>
              </div>
            </div>

            <div className="card card-padding">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="form-group">
                    <div className="h-4 w-24 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-24 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-48 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-24 gradient-shimmer rounded mb-2" />
                    <div className="h-32 w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-32 gradient-shimmer rounded-lg" />
                  </div>
                  <div className="h-10 w-full gradient-shimmer rounded-lg" />
                </div>
              ) : (

                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Ticket Type</label>
                      <select
                        value={formData.ticketType}
                        onChange={(e) =>
                          handleTicketTypeChange(e.target.value as 'Human' | 'AI')
                        }
                        className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                      >
                        {ticketTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                  {formData.ticketType === 'AI' ? (
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        value={formData.aiSubcategory}
                        onChange={(e) =>
                          handleInputChange('aiSubcategory', e.target.value)
                        }
                        className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                      >
                        {aiSubcategories.map((subcat) => (
                          <option key={subcat.value} value={subcat.value}>
                            {subcat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Subject</label>
                      <select
                        value={formData.humanTicketSubject}
                        onChange={(e) =>
                          handleInputChange('humanTicketSubject', e.target.value)
                        }
                        className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                        disabled={subjectsLoading}
                      >
                        {subjectsLoading ? (
                          <option value="">Loading subjects...</option>
                        ) : (
                          ticketSubjects.map((subject) => (
                            <option key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Order ID (example: 10867110,10867210,10867500)
                    </label>
                    <input
                      type="text"
                      value={formData.orderIds}
                      onChange={(e) => handleOrderIdsChange(e.target.value)}
                      placeholder="Enter order IDs separated by commas"
                      className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 ${orderIdsError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)]'}`}
                    />
                    {orderIdsError && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {orderIdsError}
                      </p>
                    )}
                  </div>

                  {showMessageField && (
                    <div className="form-group">
                      <label className="form-label">Message</label>
                      <textarea
                        rows={7}
                        value={formData.message}
                        onChange={(e) =>
                          handleInputChange('message', e.target.value)
                        }
                        required={showMessageField}
                        className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                        style={{ minHeight: '120px', resize: 'vertical' }}
                      />
                    </div>
                  )}

                  {showFileUpload && (
                    <div className="form-group">
                      <label className="form-label">Attachments</label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label
                            htmlFor="file-upload"
                            className="btn btn-secondary flex items-center gap-2 cursor-pointer"
                          >
                            <FaPaperclip className="w-4 h-4" />
                            {uploadingFiles ? 'Uploading...' : 'Attach Files'}
                          </label>
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            disabled={uploadingFiles || isSubmitting}
                            className="hidden"
                            accept="image/*"
                          />
                        </div>
                        {selectedFiles.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Uploaded Files:
                            </p>
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <FaPaperclip className="w-3 h-3 text-gray-500" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {file.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSelectedFile(index)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <FaTimes className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {isEnabledForForm('supportTicket') && recaptchaSettings && (
                    <ReCAPTCHA
                      siteKey={recaptchaSettings.siteKey}
                      version={recaptchaSettings.version}
                      action="supportTicket"
                      threshold={recaptchaSettings.threshold}
                      onVerify={(token) => {
                        setRecaptchaToken(token);
                      }}
                      onError={() => {
                        setRecaptchaToken(null);

                      }}
                      onExpired={() => {
                        setRecaptchaToken(null);

                      }}
                    />
                  )}

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="btn btn-primary w-full"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaInfoCircle />
                </div>
                <h3 className="card-title">Read before create Ticket</h3>
              </div>

              <div className="space-y-3 mt-4">
                <div className="card">
                  <button
                    className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleAccordion('item-1')}
                  >
                    <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 pr-4">
                      <FaCreditCard className="w-4 h-4" />
                      How to Create Ticket ?
                    </span>
                    <div
                      className={`transform transition-transform duration-200 ${
                        openAccordion === 'item-1' ? 'rotate-180' : 'rotate-0'
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openAccordion === 'item-1'
                        ? 'max-h-96 opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
                        To Create a Ticket you need to choose a Subject above (
                        <strong className="text-gray-900 dark:text-gray-100">AI Support</strong> or{' '}
                        <strong className="text-gray-900 dark:text-gray-100">Human Support</strong>). Then you can write your
                        problem and click Submit button.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <button
                    className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleAccordion('item-2')}
                  >
                    <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 pr-4">
                      <FaClock className="w-4 h-4" />
                      How long does it take to get a reply from support
                      regarding my complaint?
                    </span>
                    <div
                      className={`transform transition-transform duration-200 ${
                        openAccordion === 'item-2' ? 'rotate-180' : 'rotate-0'
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openAccordion === 'item-2'
                        ? 'max-h-96 opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
                        <strong className="text-gray-900 dark:text-gray-100">Reply Time:</strong> Our support team usually
                        responds within 5 to 45 minutes.
                        <br />
                        <strong className="text-gray-900 dark:text-gray-100">Resolution Time:</strong> Solving your issue may
                        take anywhere between 5 minutes to 48 hours, depending
                        on the complexity of the problem.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <button
                    className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleAccordion('item-3')}
                  >
                    <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 pr-4">
                      <FaInfoCircle className="w-4 h-4" />
                      Important Guidelines
                    </span>
                    <div
                      className={`transform transition-transform duration-200 ${
                        openAccordion === 'item-3' ? 'rotate-180' : 'rotate-0'
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openAccordion === 'item-3'
                        ? 'max-h-96 opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
                        <p>
                          Please open only one ticket for the same or similar
                          issue. Avoid creating multiple Ticket for the same
                          issue, as it may delay the resolution process.
                        </p>
                        <p>
                          <strong className="text-gray-900 dark:text-gray-100">
                            Important Notice: Use of Inappropriate Language
                          </strong>
                        </p>
                        <p>
                          We maintain a strict policy regarding communication
                          through Ticket. Please read the following carefully:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 ml-4">
                          <li>
                            <strong className="text-gray-900 dark:text-gray-100">No Use of Bad Language:</strong> Any form of
                            offensive, abusive, or inappropriate language will
                            not be tolerated.
                          </li>
                          <li>
                            <strong className="text-gray-900 dark:text-gray-100">Respect Our Support Team:</strong> Our team
                            is here to assist you. Treat them with respect to
                            ensure smooth communication and faster resolution.
                          </li>
                          <li>
                            <strong className="text-gray-900 dark:text-gray-100">Consequences of Violations:</strong> First
                            Offense: A warning will be issued. Repeated
                            Offenses: Your account may face temporary or
                            permanent suspension without prior notice
                          </li>
                          <li>
                            <strong className="text-gray-900 dark:text-gray-100">How to Communicate:</strong> Be clear and
                            respectful in your messages. Provide all necessary
                            details about your issue to help us assist you
                            effectively. We value all our users, and maintaining
                            a positive environment is essential for everyone's
                            benefit. Thank you for your understanding and
                            cooperation.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function TicketPageForTheme() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonTickets /> : <TicketPage />;
}

const ProtectedTicketPage = () => (
  <TicketSystemGuard>
    <TicketPageForTheme />
  </TicketSystemGuard>
);

export default ProtectedTicketPage;
