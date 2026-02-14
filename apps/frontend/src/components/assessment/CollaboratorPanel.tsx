import { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { DOMAINS } from '@wiseshift/shared';
import { collaborationApi } from '../../services/api';
import { useAssessmentStore } from '../../stores/assessmentStore';
import toast from 'react-hot-toast';

interface Collaborator {
  name: string;
  email?: string;
  domains: string[];
}

interface CollaboratorPanelProps {
  open: boolean;
  onClose: () => void;
  assessmentId: string;
}

export default function CollaboratorPanel({ open, onClose, assessmentId }: CollaboratorPanelProps) {
  const accessCode = useAssessmentStore((s) => s.accessCode);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && assessmentId) {
      fetchCollaborators();
    }
  }, [open, assessmentId]);

  const fetchCollaborators = async () => {
    try {
      const res = await collaborationApi.getCollaborators(assessmentId);
      setCollaborators(res.data.data || []);
    } catch {
      // ignore
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('Collaborator name is required');
      return;
    }
    if (selectedDomains.length === 0) {
      toast.error('Select at least one domain');
      return;
    }

    setLoading(true);
    try {
      await collaborationApi.addCollaborator(assessmentId, {
        name: name.trim(),
        email: email.trim() || undefined,
        domains: selectedDomains,
      });
      toast.success(`${name} added as collaborator`);
      setName('');
      setEmail('');
      setSelectedDomains([]);
      fetchCollaborators();
    } catch {
      toast.error('Failed to add collaborator');
    } finally {
      setLoading(false);
    }
  };

  const toggleDomain = (key: string) => {
    setSelectedDomains((prev) =>
      prev.includes(key)
        ? prev.filter((d) => d !== key)
        : [...prev, key]
    );
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/50" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-end">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <DialogPanel className="h-screen w-full max-w-md overflow-y-auto bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Collaborators
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    className="rounded-md p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-6 py-4">
                  {/* Share instructions */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Share this access code with collaborators so they can contribute:{' '}
                    <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono font-bold">
                      {accessCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        if (accessCode) navigator.clipboard.writeText(accessCode);
                        toast.success('Access code copied!');
                      }}
                      className="ml-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Add collaborator form */}
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-900">Add Collaborator</h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label htmlFor="collab-name" className="label">
                          Name *
                        </label>
                        <input
                          id="collab-name"
                          type="text"
                          className="input mt-1"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Collaborator name"
                        />
                      </div>
                      <div>
                        <label htmlFor="collab-email" className="label">
                          Email (optional)
                        </label>
                        <input
                          id="collab-email"
                          type="email"
                          className="input mt-1"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="collaborator@example.com"
                        />
                      </div>
                      <div>
                        <p className="label">Assigned Domains *</p>
                        <div className="mt-2 space-y-1">
                          {DOMAINS.map((d) => (
                            <label
                              key={d.key}
                              className="flex items-center gap-2 text-sm text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDomains.includes(d.key)}
                                onChange={() => toggleDomain(d.key)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                              />
                              {d.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleAdd}
                        disabled={loading}
                        className="btn-primary w-full"
                      >
                        <UserPlusIcon className="mr-2 h-4 w-4" />
                        {loading ? 'Adding...' : 'Add Collaborator'}
                      </button>
                    </div>
                  </div>

                  {/* Current collaborators */}
                  {collaborators.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Current Collaborators
                      </h3>
                      <div className="mt-3 space-y-2">
                        {collaborators.map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                          >
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            {c.email && (
                              <p className="text-xs text-gray-500">{c.email}</p>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.domains.map((dk) => {
                                const domain = DOMAINS.find((d) => d.key === dk);
                                return (
                                  <span
                                    key={dk}
                                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700"
                                  >
                                    {domain?.shortName || dk}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
