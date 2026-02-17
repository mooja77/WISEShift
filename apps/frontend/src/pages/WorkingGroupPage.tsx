import { useState, useEffect, useCallback } from 'react';
import { workingGroupApi } from '../services/api';
import { useAssessmentStore } from '../stores/assessmentStore';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClockIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowLeftIcon,
  TrashIcon,
  PaperAirplaneIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

type Tab = 'dashboard' | 'discussions' | 'documents' | 'activity' | 'members';

interface WorkingGroup {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  myRole: string;
  memberCount?: number;
  assignmentCount?: number;
  discussionCount?: number;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  myRole: string;
  members: { id: string; accessCode: string; displayName: string; role: string; joinedAt: string }[];
  assignments: any[];
  discussions: any[];
  documents: { id: string; title: string; url: string; description: string | null; addedBy: string; createdAt: string }[];
  activities: { id: string; actorName: string; action: string; detail: string | null; createdAt: string }[];
}

interface DashboardData {
  totalAssessments: number;
  completedAssessments: number;
  averageOverallScore: number | null;
  domainAverages: { domainKey: string; average: number; min: number; max: number; count: number }[];
  countries: string[];
  sectors: string[];
  assessments: any[];
}

export default function WorkingGroupPage() {
  const { accessCode } = useAssessmentStore();
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);

  // Create group form
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Discussion form
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscContent, setNewDiscContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Document form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');

  // Member form
  const [newMemberCode, setNewMemberCode] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  const fetchGroups = useCallback(async () => {
    if (!accessCode) return;
    try {
      const res = await workingGroupApi.list(accessCode);
      setGroups(res.data.data);
    } catch {
      // Not a member of any groups
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [accessCode]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const selectGroup = async (groupId: string) => {
    if (!accessCode) return;
    try {
      const [groupRes, dashRes] = await Promise.all([
        workingGroupApi.get(groupId, accessCode),
        workingGroupApi.getDashboard(groupId, accessCode).catch(() => null),
      ]);
      setSelectedGroup(groupRes.data.data);
      if (dashRes) setDashboard(dashRes.data.data);

      // Fetch threaded discussions
      const discRes = await workingGroupApi.getDiscussions(groupId, accessCode);
      setDiscussions(discRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load group');
    }
  };

  const handleCreateGroup = async () => {
    if (!accessCode || !newGroupName) return;
    try {
      await workingGroupApi.create({ name: newGroupName, description: newGroupDesc || undefined }, accessCode);
      toast.success('Working group created!');
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreate(false);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    }
  };

  const handlePostDiscussion = async () => {
    if (!accessCode || !selectedGroup || !newDiscContent) return;
    try {
      await workingGroupApi.postDiscussion(
        selectedGroup.id,
        { title: newDiscTitle || undefined, content: newDiscContent },
        accessCode
      );
      toast.success('Discussion posted!');
      setNewDiscTitle('');
      setNewDiscContent('');
      const discRes = await workingGroupApi.getDiscussions(selectedGroup.id, accessCode);
      setDiscussions(discRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!accessCode || !selectedGroup || !replyContent) return;
    try {
      await workingGroupApi.postDiscussion(
        selectedGroup.id,
        { content: replyContent, parentId },
        accessCode
      );
      toast.success('Reply posted!');
      setReplyContent('');
      setReplyTo(null);
      const discRes = await workingGroupApi.getDiscussions(selectedGroup.id, accessCode);
      setDiscussions(discRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reply');
    }
  };

  const handleAddDocument = async () => {
    if (!accessCode || !selectedGroup || !newDocTitle || !newDocUrl) return;
    try {
      await workingGroupApi.addDocument(
        selectedGroup.id,
        { title: newDocTitle, url: newDocUrl, description: newDocDesc || undefined },
        accessCode
      );
      toast.success('Document added!');
      setNewDocTitle('');
      setNewDocUrl('');
      setNewDocDesc('');
      selectGroup(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add document');
    }
  };

  const handleAddMember = async () => {
    if (!accessCode || !selectedGroup || !newMemberCode || !newMemberName) return;
    try {
      await workingGroupApi.addMember(
        selectedGroup.id,
        { accessCode: newMemberCode, displayName: newMemberName },
        accessCode
      );
      toast.success('Member added!');
      setNewMemberCode('');
      setNewMemberName('');
      selectGroup(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!accessCode || !selectedGroup) return;
    try {
      await workingGroupApi.removeMember(selectedGroup.id, memberId, accessCode);
      toast.success('Member removed');
      selectGroup(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!accessCode || !selectedGroup) return;
    try {
      await workingGroupApi.removeDocument(selectedGroup.id, docId, accessCode);
      toast.success('Document removed');
      selectGroup(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove document');
    }
  };

  if (!accessCode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center card max-w-md">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Access Code Required</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Complete an assessment to get an access code, then return here to create or join a working group.
          </p>
        </div>
      </div>
    );
  }

  // Group detail view
  if (selectedGroup) {
    const isAdmin = selectedGroup.myRole === 'admin';

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <button onClick={() => { setSelectedGroup(null); setDashboard(null); }} className="rounded-lg p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700">
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedGroup.name}</h1>
              {selectedGroup.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedGroup.description}</p>
              )}
            </div>
            <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              selectedGroup.myRole === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                : selectedGroup.myRole === 'observer' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {selectedGroup.myRole}
            </span>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {([
              { key: 'dashboard' as Tab, label: 'Dashboard', icon: ChartBarIcon },
              { key: 'discussions' as Tab, label: 'Discussions', icon: ChatBubbleLeftRightIcon },
              { key: 'documents' as Tab, label: 'Documents', icon: DocumentTextIcon },
              { key: 'activity' as Tab, label: 'Activity', icon: ClockIcon },
              { key: 'members' as Tab, label: 'Members', icon: UserGroupIcon },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {tab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card text-center">
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{dashboard.totalAssessments}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assigned Assessments</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboard.completedAssessments}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {dashboard.averageOverallScore != null ? dashboard.averageOverallScore.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Average Score</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dashboard.countries.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Countries</p>
                </div>
              </div>

              {/* Domain Averages */}
              {dashboard.domainAverages.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Domain Averages</h3>
                  <div className="space-y-3">
                    {dashboard.domainAverages.map(da => (
                      <div key={da.domainKey} className="flex items-center gap-3">
                        <span className="w-40 truncate text-sm text-gray-700 dark:text-gray-300">{da.domainKey}</span>
                        <div className="flex-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${(da.average / 5) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {da.average.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessment List */}
              {dashboard.assessments.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Assigned Assessments</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Organisation</th>
                          <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Country</th>
                          <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Sector</th>
                          <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Status</th>
                          <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.assessments.map((a: any) => (
                          <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{a.organisationName}</td>
                            <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{a.country || '—'}</td>
                            <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{a.sector || '—'}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                a.status === 'completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>{a.status}</span>
                            </td>
                            <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                              {a.overallScore != null ? a.overallScore.toFixed(1) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Discussions Tab */}
          {tab === 'discussions' && (
            <div className="space-y-4">
              {/* New Discussion Form */}
              {selectedGroup.myRole !== 'observer' && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">New Discussion</h3>
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={newDiscTitle}
                    onChange={e => setNewDiscTitle(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <textarea
                    placeholder="Write your message..."
                    value={newDiscContent}
                    onChange={e => setNewDiscContent(e.target.value)}
                    rows={3}
                    className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button onClick={handlePostDiscussion} disabled={!newDiscContent} className="btn-primary text-sm flex items-center gap-1">
                    <PaperAirplaneIcon className="h-4 w-4" /> Post
                  </button>
                </div>
              )}

              {/* Discussion Threads */}
              {discussions.length === 0 ? (
                <div className="card text-center py-8">
                  <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No discussions yet. Start one above!</p>
                </div>
              ) : (
                discussions.map((thread: any) => (
                  <div key={thread.id} className="card">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        {thread.title && (
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{thread.title}</h4>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{thread.content}</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {thread.authorName} &middot; {new Date(thread.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Replies */}
                    {thread.replies && thread.replies.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
                        {thread.replies.map((reply: any) => (
                          <div key={reply.id}>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reply.content}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {reply.authorName} &middot; {new Date(reply.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    {selectedGroup.myRole !== 'observer' && (
                      replyTo === thread.id ? (
                        <div className="mt-3 ml-6 flex gap-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            onKeyDown={e => { if (e.key === 'Enter') handleReply(thread.id); }}
                          />
                          <button onClick={() => handleReply(thread.id)} className="btn-primary text-xs">Reply</button>
                          <button onClick={() => { setReplyTo(null); setReplyContent(''); }} className="btn-secondary text-xs">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyTo(thread.id)}
                          className="mt-2 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
                        >
                          Reply
                        </button>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Documents Tab */}
          {tab === 'documents' && (
            <div className="space-y-4">
              {selectedGroup.myRole !== 'observer' && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Document Link</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Document title"
                      value={newDocTitle}
                      onChange={e => setNewDocTitle(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newDocUrl}
                      onChange={e => setNewDocUrl(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newDocDesc}
                    onChange={e => setNewDocDesc(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button onClick={handleAddDocument} disabled={!newDocTitle || !newDocUrl} className="btn-primary text-sm mt-2 flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" /> Add Document
                  </button>
                </div>
              )}

              {selectedGroup.documents.length === 0 ? (
                <div className="card text-center py-8">
                  <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No documents shared yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedGroup.documents.map(doc => (
                    <div key={doc.id} className="card flex items-center gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                          {doc.title}
                        </a>
                        {doc.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.description}</p>}
                        <p className="text-xs text-gray-400 dark:text-gray-500">{doc.addedBy} &middot; {new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleRemoveDocument(doc.id)} className="text-gray-400 hover:text-red-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {tab === 'activity' && (
            <div className="card">
              {selectedGroup.activities.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedGroup.activities.map(act => (
                    <div key={act.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 dark:border-gray-800 last:border-0">
                      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                        act.action === 'created' ? 'bg-green-500'
                          : act.action === 'joined' ? 'bg-blue-500'
                          : act.action === 'posted' ? 'bg-purple-500'
                          : act.action === 'assigned' ? 'bg-amber-500'
                          : act.action === 'uploaded' ? 'bg-teal-500'
                          : 'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{act.actorName}</span>{' '}
                          {act.action}{act.detail ? `: ${act.detail}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(act.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {tab === 'members' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Member</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Organisation access code (WISE-XXXXXX)"
                      value={newMemberCode}
                      onChange={e => setNewMemberCode(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      placeholder="Display name"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <button onClick={handleAddMember} disabled={!newMemberCode || !newMemberName} className="btn-primary text-sm mt-2 flex items-center gap-1">
                    <PlusIcon className="h-4 w-4" /> Add Member
                  </button>
                </div>
              )}

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Members ({selectedGroup.members.length})
                </h3>
                <div className="space-y-2">
                  {selectedGroup.members.map(m => (
                    <div key={m.id} className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.displayName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : m.role === 'observer' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>{m.role}</span>
                        {isAdmin && m.role !== 'admin' && (
                          <button onClick={() => handleRemoveMember(m.id)} className="text-gray-400 hover:text-red-500">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group list view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Working Groups</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Collaborate with other WISEs in your sector or region
            </p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4" /> Create Group
          </button>
        </div>

        {/* Create Group Form */}
        {showCreate && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Create Working Group</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <textarea
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="flex gap-2">
                <button onClick={handleCreateGroup} disabled={!newGroupName} className="btn-primary">Create</button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Group List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="card text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No Working Groups Yet</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Create a working group to start collaborating with other WISEs, or ask a group admin to invite you.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => selectGroup(g.id)}
                className="card-interactive text-left p-5"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{g.name}</h3>
                {g.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{g.description}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <UserGroupIcon className="h-3.5 w-3.5" /> {g.memberCount || 0} members
                  </span>
                  <span className="flex items-center gap-1">
                    <ChartBarIcon className="h-3.5 w-3.5" /> {g.assignmentCount || 0} assessments
                  </span>
                  <span className="flex items-center gap-1">
                    <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" /> {g.discussionCount || 0} discussions
                  </span>
                </div>
                <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  g.myRole === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>{g.myRole}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
