import { useState } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import TranscriptUploadModal from './TranscriptUploadModal';
import AutoCodeModal from './AutoCodeModal';
import CaseManagerPanel from './CaseManagerPanel';
import HierarchyPanel from './HierarchyPanel';
import AddComputedNodeMenu from './AddComputedNodeMenu';
import toast from 'react-hot-toast';

export default function CanvasToolbar() {
  const { activeCanvas, closeCanvas, addTranscript, addQuestion, addMemo, showCodingStripes, toggleCodingStripes } = useCanvasStore();
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [showAutoCode, setShowAutoCode] = useState(false);
  const [showCaseManager, setShowCaseManager] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(false);

  if (!activeCanvas) return null;

  const handleAddTranscript = async (title: string, content: string) => {
    try {
      await addTranscript(title, content);
      setShowTranscriptModal(false);
      toast.success('Transcript added');
    } catch {
      toast.error('Failed to add transcript');
    }
  };

  const handleAddQuestion = async () => {
    if (!questionText.trim()) return;
    try {
      await addQuestion(questionText.trim());
      setQuestionText('');
      setShowQuestionInput(false);
      toast.success('Question added');
    } catch {
      toast.error('Failed to add question');
    }
  };

  const handleAddMemo = async () => {
    try {
      await addMemo('New memo — click to edit');
      toast.success('Memo added');
    } catch {
      toast.error('Failed to add memo');
    }
  };

  return (
    <>
      <div data-tour="canvas-toolbar" className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={closeCanvas}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Back to canvas list"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
            {activeCanvas.name}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {showQuestionInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input h-8 w-60 text-sm"
                placeholder="Enter research question..."
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddQuestion(); if (e.key === 'Escape') setShowQuestionInput(false); }}
                autoFocus
              />
              <button onClick={handleAddQuestion} disabled={!questionText.trim()} className="btn-primary h-8 px-3 text-xs">
                Add
              </button>
              <button onClick={() => setShowQuestionInput(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                data-tour="canvas-btn-transcript"
                onClick={() => setShowTranscriptModal(true)}
                className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Transcript
              </button>
              <button
                data-tour="canvas-btn-question"
                onClick={() => setShowQuestionInput(true)}
                className="flex items-center gap-1.5 rounded-md bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Question
              </button>
              <button
                data-tour="canvas-btn-memo"
                onClick={handleAddMemo}
                className="flex items-center gap-1.5 rounded-md bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Memo
              </button>

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Auto-Code button */}
              <button
                data-tour="canvas-btn-autocode"
                onClick={() => setShowAutoCode(true)}
                className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                Auto-Code
              </button>

              {/* Cases button */}
              <button
                data-tour="canvas-btn-cases"
                onClick={() => setShowCaseManager(true)}
                className="flex items-center gap-1.5 rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Cases
              </button>

              {/* Hierarchy button */}
              <button
                data-tour="canvas-btn-hierarchy"
                onClick={() => setShowHierarchy(true)}
                className="flex items-center gap-1.5 rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                Hierarchy
              </button>

              {/* Coding Stripes toggle */}
              <button
                data-tour="canvas-btn-stripes"
                onClick={toggleCodingStripes}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${showCodingStripes
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'}`}
                title="Toggle coding stripes"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                Stripes
              </button>

              {/* Add Query dropdown */}
              <AddComputedNodeMenu />
            </>
          )}
        </div>
      </div>

      {showTranscriptModal && (
        <TranscriptUploadModal onSubmit={handleAddTranscript} onClose={() => setShowTranscriptModal(false)} />
      )}
      {showAutoCode && <AutoCodeModal onClose={() => setShowAutoCode(false)} />}
      {showCaseManager && <CaseManagerPanel onClose={() => setShowCaseManager(false)} />}
      {showHierarchy && <HierarchyPanel onClose={() => setShowHierarchy(false)} />}
    </>
  );
}
