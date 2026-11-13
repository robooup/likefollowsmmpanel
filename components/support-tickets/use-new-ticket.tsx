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

// State, uploads and submission for the new ticket form, plus the user ticket list. Shared by every user theme.
export function useNewTicket() {
  const router = useRouter();
  const { appName } = useAppNameWithFallback();

  useEffect(() => {
    setPageTitle('Support Tickets', appName);
  }, [appName]);

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<TicketFormData>({
    category: '1',
    subcategory: '2',
    ticketType: 'AI',
    aiSubcategory: 'Refill',
    humanTicketSubject: '',
    orderIds: '',
    message: '',
    subject: '',
    priority: 'medium',
    attachments: [],
  });
  const [showMessageField, setShowMessageField] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [orderIdsError, setOrderIdsError] = useState<string>('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const { recaptchaSettings, isEnabledForForm } = useReCAPTCHA();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [ticketSubjects, setTicketSubjects] = useState<{ id: number; name: string }[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const response = await fetch('/api/support-tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        showToast('Failed to fetch tickets', 'error');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showToast('Error fetching tickets', 'error');
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchTicketSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const response = await fetch('/api/ticket-subjects');
      if (response.ok) {
        const data = await response.json();
        setTicketSubjects(data.subjects || []);
      } else {
        console.error('Failed to fetch ticket subjects');
      }
    } catch (error) {
      console.error('Error fetching ticket subjects:', error);
    } finally {
      setSubjectsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchTicketSubjects();
  }, []);

  useEffect(() => {
    if (ticketSubjects.length > 0 && !formData.humanTicketSubject) {
      setFormData(prev => ({
        ...prev,
        humanTicketSubject: ticketSubjects[0].id.toString()
      }));
    }
  }, [ticketSubjects, formData.humanTicketSubject]);

  const ticketTypes = [
    { value: 'Human', label: 'Human Ticket' },
    { value: 'AI', label: 'AI Ticket' },
  ];

  const categories = [
    { value: '1', label: 'AI Support' },
    { value: '13', label: 'Human Support' },
  ];

  const subcategories = [
    { value: '2', label: 'Refill' },
    { value: '4', label: 'Cancel' },
  ];

  const aiSubcategories = [
    { value: 'Refill', label: 'Refill' },
    { value: 'Cancel', label: 'Cancel' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (formData.ticketType === 'AI') {

      setShowMessageField(false);
      setShowFileUpload(false);
      const subcategoryMap: Record<string, string> = {
        'Refill': '2',
        'Cancel': '4',
      };
      const mappedSubcategory = subcategoryMap[formData.aiSubcategory] || '2';
      
      const formattedOrderIds = formData.orderIds 
        ? formData.orderIds.split(',').map(id => id.trim()).join(', ')
        : 'Order ID Not Found';
      
      const orderIdsArray = formData.orderIds 
        ? formData.orderIds.split(',').map(id => id.trim()).filter(id => id)
        : [];
      const orderIdLabel = orderIdsArray.length === 1 ? 'Order ID' : 'Order IDs';
      
      const formattedMessage = `Category: ${formData.aiSubcategory}\n${orderIdLabel}: ${formattedOrderIds}`;
      
      setFormData((prev) => ({
        ...prev,
        category: '1',
        subcategory: mappedSubcategory,
        message: formattedMessage,
      }));
    }
  }, [formData.ticketType, formData.aiSubcategory, formData.orderIds]);

  useEffect(() => {
    if (formData.ticketType === 'Human') {

      setShowMessageField(true);
      setShowFileUpload(true);
      setFormData((prev) => ({
        ...prev,
        category: '13',

      }));
    }
  }, [formData.ticketType]);

  const handleTicketTypeChange = (ticketType: 'Human' | 'AI') => {
    setFormData((prev) => ({
      ...prev,
      ticketType,

      aiSubcategory: ticketType === 'AI' ? 'Refill' : prev.aiSubcategory,
      subcategory: ticketType === 'Human' ? '2' : prev.subcategory,
      humanTicketSubject: ticketType === 'Human' ? (ticketSubjects.length > 0 ? ticketSubjects[0].id.toString() : '1') : prev.humanTicketSubject,
      orderIds: '',
      message: '',
    }));
  };

  const handleInputChange = (field: keyof TicketFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOrderIdsChange = (value: string) => {

    const sanitized = value.replace(/[^0-9,]/g, '');

    if (sanitized) {
      const orderIds = sanitized.split(',').map(id => id.trim()).filter(id => id);
      const invalidIds = orderIds.filter(id => {

        return !/^\d+$/.test(id);
      });

      if (invalidIds.length > 0) {
        setOrderIdsError(`Invalid order ID format: ${invalidIds.join(', ')}. Order IDs should be numeric.`);
      } else if (orderIds.length > 10) {
        setOrderIdsError('Maximum 10 order IDs allowed per ticket.');
      } else {
        setOrderIdsError('');
      }
    } else {
      setOrderIdsError('');
    }

    handleInputChange('orderIds', sanitized);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];

    for (const file of files) {
      const maxSize = 3 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(`File "${file.name}" is too large. Maximum 3MB allowed.`, 'error');
        continue;
      }

      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf'
      ];
      if (!allowedTypes.includes(file.type)) {
        showToast(`File "${file.name}" has an unsupported format. Only images and PDFs are allowed.`, 'error');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      showToast(`${validFiles.length} file(s) selected successfully!`, 'success');
    }

    event.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let attachmentUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        try {
          for (const file of selectedFiles) {
            const maxSize = 3 * 1024 * 1024;
            if (file.size > maxSize) {
              showToast(`File "${file.name}" is too large. Maximum 3MB allowed.`, 'error');
              continue;
            }

            const allowedTypes = [
              'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
              'application/pdf'
            ];
            if (!allowedTypes.includes(file.type)) {
              showToast(`File "${file.name}" has an unsupported format. Only images and PDFs are allowed.`, 'error');
              continue;
            }

            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('type', 'support_ticket_uploads');

            const responseUpload = await fetch('/api/upload', {
              method: 'POST',
              body: formDataUpload,
            });

            if (responseUpload.ok) {
              const result = await responseUpload.json();
              if (result.fileUrl) {
                attachmentUrls.push(result.fileUrl);
              }
            } else {
              const error = await responseUpload.json().catch(() => ({ error: 'Failed to upload file' }));
              showToast(`Failed to upload "${file.name}": ${error.error}`, 'error');
            }
          }
        } finally {
          setUploadingFiles(false);
        }
      }

      if (isEnabledForForm('supportTicket') && !recaptchaToken) {
        showToast('Please complete the ReCAPTCHA verification', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!formData.orderIds.trim() && !formData.message.trim()) {
        showToast('Please fill order ID and message field', 'error');
        setIsSubmitting(false);
        return;
      }

      if (formData.ticketType === 'Human' && !formData.message.trim()) {
        showToast('Message is required for Human Support ticket', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!formData.orderIds.trim()) {
        showToast('Order ID is required for all tickets', 'error');
        setIsSubmitting(false);
        return;
      }

      if (orderIdsError) {
        showToast('Please fix order ID format errors before submitting', 'error');
        setIsSubmitting(false);
        return;
      }

      let subject = '';
      if (formData.ticketType === 'Human') {

        const selectedSubject = ticketSubjects.find(s => s.id === parseInt(formData.humanTicketSubject));
        subject = selectedSubject ? selectedSubject.name : 'General Support';
      } else {

        const categoryLabel = categories.find(c => c.value === formData.category)?.label || 'Support';
        const subcategoryLabel = subcategories.find(s => s.value === formData.subcategory)?.label || '';
        subject = `${categoryLabel} - ${subcategoryLabel}`;
      }

      const orderIds = formData.orderIds ? formData.orderIds.split(',').map(id => id.trim()).filter(id => id) : [];

      const ticketData = {
        subject,
        message: formData.message,
        category: formData.category,
        subcategory: formData.subcategory,
        ticketType: formData.ticketType,
        aiSubcategory: formData.aiSubcategory,
        humanTicketSubject: formData.humanTicketSubject,
        orderIds,
        priority: formData.priority,
        attachments: attachmentUrls,
        ...(recaptchaToken && { recaptchaToken }),
      };

      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Ticket submitted successfully! Redirecting to ticket details...', 'success');

        if (result.ticket && result.ticket.id) {
          router.push(`/support-tickets/${result.ticket.id}`);
        } else {

          setFormData({
            category: '1',
            subcategory: '2',
            ticketType: 'AI',
            aiSubcategory: 'Refill',
            humanTicketSubject: '1',
            orderIds: '',
            message: '',
            subject: '',
            priority: 'medium',
            attachments: [],
          });
          setSelectedFiles([]);

          fetchTickets();
        }
      } else {
        const error = await response.json();
        showToast(error.error || error.message || 'Failed to submit ticket', 'error');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      showToast('Failed to submit ticket. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case 'open':
        return (
          <span className={`${baseClasses} bg-purple-100 text-purple-800`}>
            Open
          </span>
        );
      case 'answered':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Answered
          </span>
        );
      case 'in_progress':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            In Progress
          </span>
        );
      case 'closed':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Closed
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Pending
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            {status}
          </span>
        );
    }
  };

  const handleticketsHistoryClick = () => {

    router.push('/support-tickets/history');
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return {
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
  };
}
