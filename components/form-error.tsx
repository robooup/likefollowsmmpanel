'use client';

import { useRouter } from "next/navigation";
import { FaExclamationTriangle } from "react-icons/fa";
import { FormToast } from "@/components/form-toast";

interface FormErrorProps {
  message?: string;
  inline?: boolean;
}

export const FormError: React.FC<FormErrorProps> = ({ message, inline }) => {
  const router = useRouter();

  if (!message) return null;

  const contactSupportRegex = /(.*?)(contact support)(.*)/i;
  const match = message.match(contactSupportRegex);

  if (match) {
    const [, beforeText, contactText, afterText] = match;

    const content = (
      <>
          {beforeText}
          <button
             onClick={() => router.push('/contact')}
             className="underline hover:no-underline cursor-pointer font-medium text-blue-600 hover:text-blue-800 transition-colors"
             type="button"
             title="Click to go to contact page"
           >
             {contactText}
           </button>
          {afterText}
      </>
    );
    if (!inline) {
      return (
        <FormToast message={message} type="error">
          {content}
        </FormToast>
      );
    }
    return (
      <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
        <FaExclamationTriangle className="w-4 h-4" />
        <span>{content}</span>
      </div>
    );
  }

  if (!inline) return <FormToast message={message} type="error" />;

  return (
    <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
      <FaExclamationTriangle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
};
