import { useEffect, useRef, useCallback } from 'react';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useUiStore } from '../stores/uiStore';
import { assessmentApi } from '../services/api';
import toast from 'react-hot-toast';

export function useAutoSave(intervalMs = 30000) {
  const assessmentId = useAssessmentStore(s => s.assessmentId);
  const responses = useAssessmentStore(s => s.responses);
  const status = useAssessmentStore(s => s.status);
  const collaboratorName = useAssessmentStore(s => s.collaboratorName);
  const setSaving = useUiStore(s => s.setSaving);
  const setLastSaved = useUiStore(s => s.setLastSaved);
  const setSaveError = useUiStore(s => s.setSaveError);
  const lastResponsesRef = useRef<string>('');

  const saveResponses = useCallback(async () => {
    if (!assessmentId || status !== 'in_progress') return;

    const responsesArray = Object.values(responses).map(r => ({
      ...r,
      ...(collaboratorName ? { claimedBy: collaboratorName } : {}),
    }));
    if (responsesArray.length === 0) return;

    const currentHash = JSON.stringify(responsesArray);
    if (currentHash === lastResponsesRef.current) return;

    try {
      setSaving(true);
      await assessmentApi.saveResponses(assessmentId, responsesArray);
      lastResponsesRef.current = currentHash;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveError('Failed to save progress');
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  }, [assessmentId, responses, status, collaboratorName, setSaving, setLastSaved, setSaveError]);

  // Periodic auto-save
  useEffect(() => {
    if (status !== 'in_progress') return;
    const interval = setInterval(saveResponses, intervalMs);
    return () => clearInterval(interval);
  }, [saveResponses, intervalMs, status]);

  // Save on unmount
  useEffect(() => {
    return () => { saveResponses(); };
  }, [saveResponses]);

  return { saveResponses };
}
