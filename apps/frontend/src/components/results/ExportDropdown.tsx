import { Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { exportApi } from '../../services/api';
import toast from 'react-hot-toast';

interface ExportDropdownProps {
  assessmentId: string;
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportDropdown({ assessmentId }: ExportDropdownProps) {
  const handleExport = async (
    exportFn: () => Promise<any>,
    filename: string,
    label: string
  ) => {
    try {
      const res = await exportFn();
      downloadBlob(new Blob([res.data]), filename);
      toast.success(`${label} downloaded`);
    } catch (err) {
      toast.error(`Failed to export ${label}`);
    }
  };

  const items = [
    {
      label: 'Export for NVivo (CSV)',
      onClick: () =>
        handleExport(
          () => exportApi.qualitativeCsv(assessmentId),
          `wiseshift-qualitative-${assessmentId}.csv`,
          'CSV'
        ),
    },
    {
      label: 'Export for NVivo (Excel)',
      onClick: () =>
        handleExport(
          () => exportApi.qualitativeXlsx(assessmentId),
          `wiseshift-qualitative-${assessmentId}.xlsx`,
          'Excel'
        ),
    },
    {
      label: 'Export as Word',
      onClick: () =>
        handleExport(
          () => exportApi.docx(assessmentId),
          `wiseshift-report-${assessmentId}.docx`,
          'Word document'
        ),
    },
    {
      label: 'Full Data (JSON)',
      onClick: () =>
        handleExport(
          () => exportApi.json(assessmentId),
          `wiseshift-assessment-${assessmentId}.json`,
          'JSON'
        ),
    },
    {
      label: 'All Responses (CSV)',
      onClick: () =>
        handleExport(
          () => exportApi.csv(assessmentId),
          `wiseshift-assessment-${assessmentId}.csv`,
          'CSV'
        ),
    },
    {
      label: 'Case Study (Word)',
      onClick: () =>
        handleExport(
          () => exportApi.caseStudyDocx(assessmentId),
          `wiseshift-case-study-${assessmentId}.docx`,
          'Case Study DOCX'
        ),
    },
    {
      label: 'Case Study (JSON)',
      onClick: () =>
        handleExport(
          () => exportApi.caseStudyJson(assessmentId),
          `wiseshift-case-study-${assessmentId}.json`,
          'Case Study JSON'
        ),
    },
  ];

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton className="btn-secondary inline-flex items-center gap-2">
        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
        Export Data
        <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-gray-200 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
          <div className="py-1">
            {items.map((item) => (
              <MenuItem key={item.label}>
                {({ focus }) => (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={`${
                      focus ? 'bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                    } block w-full px-4 py-2 text-left text-sm`}
                  >
                    {item.label}
                  </button>
                )}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
