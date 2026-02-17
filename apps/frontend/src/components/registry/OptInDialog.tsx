import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface OptInDialogProps {
  open: boolean;
  onClose: () => void;
  assessmentId: string;
  accessCode: string;
}

export default function OptInDialog({ open, onClose, assessmentId, accessCode }: OptInDialogProps) {
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [targetPopulations, setTargetPopulations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {};
      if (bio.trim()) body.bio = bio.trim();
      if (website.trim()) body.website = website.trim();
      if (foundingYear.trim()) body.foundingYear = Number(foundingYear);
      if (targetPopulations.trim()) {
        body.targetPopulations = targetPopulations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const res = await api.post(`/registry/opt-in`, body, {
        headers: { 'x-access-code': accessCode },
      });

      const slug = res.data?.slug ?? res.data?.profile?.slug;
      if (slug) {
        toast.success(`Profile live at /registry/${slug}`);
      } else {
        toast.success('Successfully opted into the public registry!');
      }

      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to opt into registry. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Join the WISE Public Registry
          </DialogTitle>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Share your profile with the WISE community. All fields are optional.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Bio */}
            <div>
              <label
                htmlFor="registry-bio"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Bio
              </label>
              <textarea
                id="registry-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the WISE community about your organisation..."
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
              />
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="registry-website"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Website
              </label>
              <input
                id="registry-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.org"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
              />
            </div>

            {/* Founding Year */}
            <div>
              <label
                htmlFor="registry-founding-year"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Founding Year
              </label>
              <input
                id="registry-founding-year"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
                placeholder={String(new Date().getFullYear())}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
              />
            </div>

            {/* Target Populations */}
            <div>
              <label
                htmlFor="registry-target-populations"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Target Populations
              </label>
              <input
                id="registry-target-populations"
                type="text"
                value={targetPopulations}
                onChange={(e) => setTargetPopulations(e.target.value)}
                placeholder="e.g. Youth, Women, Rural communities"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Comma-separated list
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? 'Joining...' : 'Join Registry'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
