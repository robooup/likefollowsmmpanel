'use client';

import { FaCheckCircle } from 'react-icons/fa';
import { FormToast } from '@/components/form-toast';

interface FormSuccessProps {
  message?: string;
  inline?: boolean;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({ message, inline }) => {
  if (!message) return null;
  if (!inline) return <FormToast message={message} type="success" />;
  return (
    <div className="bg-emerald-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-emerald-500">
      <FaCheckCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
};
