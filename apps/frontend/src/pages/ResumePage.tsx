import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentApi } from '../services/api';
import { useAssessmentStore } from '../stores/assessmentStore';
import toast from 'react-hot-toast';

export default function ResumePage() {
  const navigate = useNavigate();
  const { resumeAssessment } = useAssessmentStore();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResume = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter your access code');
      return;
    }

    setLoading(true);
    try {
      const res = await assessmentApi.resume(code);
      const { assessment, responses } = res.data.data;
      const org = assessment.organisation;

      resumeAssessment(
        assessment.id,
        code,
        org.id,
        {
          name: org.name,
          country: org.country,
          region: org.region,
          sector: org.sector,
          size: org.size,
          legalStructure: org.legalStructure,
        },
        responses
      );

      toast.success('Assessment resumed successfully!');

      if (assessment.status === 'completed') {
        navigate(`/results?id=${assessment.id}`);
      } else {
        navigate('/assessment');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Invalid access code. Please check and try again.');
      } else {
        toast.error('Failed to resume assessment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Resume Assessment</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your access code to continue where you left off.
            </p>
          </div>

          <form onSubmit={handleResume} className="mt-6 space-y-4">
            <div>
              <label htmlFor="accessCode" className="label">Access Code</label>
              <input
                id="accessCode"
                type="text"
                className="input mt-1 text-center font-mono text-lg tracking-wider"
                placeholder="WISE-XXXXXX"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                maxLength={12}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                Your access code was provided when you started your assessment (e.g., WISE-A7X9K2).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="btn-primary w-full"
            >
              {loading ? 'Loading...' : 'Resume Assessment'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-brand-600 hover:text-brand-800"
            >
              Start a new assessment instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
