import { EnvelopeIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface EmailAccessCodeProps {
  accessCode: string;
}

export default function EmailAccessCode({ accessCode }: EmailAccessCodeProps) {
  const subject = encodeURIComponent('Your WISEShift Access Code');
  const body = encodeURIComponent(
    `Your WISEShift Self-Assessment access code is:\n\n${accessCode}\n\n` +
    `Use this code to resume your assessment at any time.\n\n` +
    `Visit the WISEShift Self-Assessment Tool and click "Resume Existing Assessment" to continue.\n\n` +
    `Important: Keep this code safe — it is the only way to access your assessment data.`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(accessCode);
    toast.success('Access code copied to clipboard!');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`mailto:?subject=${subject}&body=${body}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <EnvelopeIcon className="h-4 w-4" />
        Email Access Code
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
        Copy Code
      </button>
    </div>
  );
}
