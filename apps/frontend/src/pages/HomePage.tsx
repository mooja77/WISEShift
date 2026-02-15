import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DOMAINS, AVAILABLE_SECTORS } from '@wiseshift/shared';
import { assessmentApi } from '../services/api';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useTour } from '../hooks/useTour';
import { homeTourSteps } from '../config/tourSteps';
import toast from 'react-hot-toast';
import EmailAccessCode from '../components/common/EmailAccessCode';

const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
  'Slovenia', 'Spain', 'Sweden', 'Serbia', 'United Kingdom', 'Other',
];

const LEGAL_STRUCTURES_BY_COUNTRY: Record<string, string[]> = {
  'France': ['SCOP (Cooperative)', 'SCIC (Collective Interest Cooperative)', 'Entreprise d\'Insertion (EI)', 'ETTI (Temporary Work Integration Enterprise)', 'Atelier et Chantier d\'Insertion (ACI)', 'Association Loi 1901', 'Foundation', 'Other'],
  'Germany': ['gGmbH (Non-profit Limited Company)', 'Genossenschaft (Cooperative)', 'eingetragener Verein (e.V.)', 'Werkstatt für Menschen mit Behinderung (WfbM)', 'Sozialunternehmen', 'Stiftung (Foundation)', 'Other'],
  'Italy': ['Cooperativa Sociale Tipo A', 'Cooperativa Sociale Tipo B', 'Impresa Sociale', 'Associazione', 'Fondazione', 'Cooperativa', 'Other'],
  'Spain': ['Cooperativa', 'Centro Especial de Empleo (CEE)', 'Empresa de Inserción (EI)', 'Asociación', 'Fundación', 'Sociedad Laboral', 'Other'],
  'Belgium': ['ASBL / VZW', 'Entreprise d\'Insertion', 'Entreprise de Formation par le Travail (EFT)', 'Société Coopérative', 'Fondation d\'Utilité Publique', 'Other'],
  'Netherlands': ['Stichting (Foundation)', 'Coöperatie (Cooperative)', 'BV (Social)', 'SW-bedrijf (Social Workshop)', 'Vereniging (Association)', 'Other'],
  'Poland': ['Spółdzielnia Socjalna (Social Cooperative)', 'Fundacja (Foundation)', 'Stowarzyszenie (Association)', 'Spółka Non-Profit', 'Other'],
  'Ireland': ['CLG (Company Limited by Guarantee)', 'Co-operative Society', 'Charitable Trust', 'CIC (Community Interest Company)', 'Other'],
  'Austria': ['Gemeinnützige GmbH', 'Genossenschaft', 'Verein', 'Sozialökonomischer Betrieb', 'Other'],
  'Denmark': ['Registreret Socialøkonomisk Virksomhed', 'Forening (Association)', 'Fond (Foundation)', 'Other'],
  'Finland': ['Sosiaalinen Yritys (Social Enterprise)', 'Osakeyhtiö (Limited Company)', 'Osuuskunta (Cooperative)', 'Yhdistys (Association)', 'Other'],
  'Sweden': ['Arbetskooperativ (Worker Cooperative)', 'Socialt Företag', 'Ekonomisk Förening', 'Ideell Förening', 'Other'],
  'Portugal': ['Cooperativa', 'IPSS (Private Social Solidarity Institution)', 'Associação', 'Fundação', 'Empresa de Inserção', 'Other'],
  'Greece': ['ΚΟΙΝ.Σ.ΕΠ. (Social Cooperative Enterprise)', 'Cooperative', 'Association', 'Other'],
  'Croatia': ['Socijalna Zadruga (Social Cooperative)', 'Udruga (Association)', 'Zaklada (Foundation)', 'Other'],
  'Serbia': ['Socijalno Preduzeće', 'Zadruga (Cooperative)', 'Udruženje (Association)', 'Other'],
  'United Kingdom': ['CIC (Community Interest Company)', 'CIO (Charitable Incorporated Organisation)', 'Co-operative Society', 'Charity', 'Social Enterprise', 'Other'],
};

const DEFAULT_LEGAL_STRUCTURES = [
  'Cooperative / SCE (European Cooperative Society)',
  'Social Enterprise',
  'Association',
  'Foundation',
  'Not-for-profit Company',
  'Societas Europaea (SE)',
  'B Corporation',
  'Other',
];

const ORG_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startAssessment, assessmentId, accessCode, status } = useAssessmentStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    country: '',
    region: '',
    sector: '',
    size: '',
    legalStructure: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('errors.organisationRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await assessmentApi.create({
        name: form.name,
        country: form.country || undefined,
        region: form.region || undefined,
        sector: form.sector || undefined,
        size: form.size || undefined,
        legalStructure: form.legalStructure || undefined,
      });
      const { assessment, accessCode } = res.data.data;
      startAssessment(assessment.id, accessCode, assessment.organisationId, form);
      toast.success(`Assessment created! Your access code: ${accessCode}`);
      navigate('/assessment');
    } catch (err) {
      toast.error(t('errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const { hasSeenTour, startTour } = useTour('home', homeTourSteps);

  useEffect(() => {
    if (!hasSeenTour) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [hasSeenTour, startTour]);

  const hasActiveAssessment = assessmentId && status === 'in_progress';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
            <span className="block">{t('home.title')}</span>
            <span className="block text-brand-600">{t('home.subtitle')}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            {t('home.description')}
          </p>
        </div>

        {/* Domain Overview Cards */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {DOMAINS.map((domain) => (
            <div
              key={domain.key}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
            >
              <div
                className="mb-2 h-1.5 w-10 rounded-full"
                style={{ backgroundColor: domain.color }}
              />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{domain.shortName}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{domain.description}</p>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* Resume Assessment */}
          {hasActiveAssessment && (
            <div className="card border-2 border-brand-200 bg-brand-50 lg:col-span-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-900">{t('home.continueAssessment')}</h2>
                  <p className="mt-2 text-sm text-brand-700">
                    {t('home.continueDescription')}{' '}
                    <code className="rounded bg-brand-100 px-2 py-0.5 font-mono font-bold">
                      {accessCode}
                    </code>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                  In Progress
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => navigate('/assessment')}
                  className="btn-primary"
                >
                  {t('home.continueAssessment')}
                </button>
                {accessCode && <EmailAccessCode accessCode={accessCode} />}
              </div>
            </div>
          )}

          {/* Start New Assessment */}
          <div className="card lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('home.startNew')}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('home.startNewDescription')}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="label">
                    {t('form.organisationNameRequired')}
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    className="input mt-1"
                    placeholder={t('form.organisationNamePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="country" className="label">{t('form.country')}</label>
                  <select
                    id="country"
                    className="input mt-1"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value, legalStructure: '' })}
                  >
                    <option value="">{t('form.selectCountry')}</option>
                    {EU_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="region" className="label">{t('form.region')}</label>
                  <input
                    id="region"
                    type="text"
                    className="input mt-1"
                    placeholder={t('form.regionPlaceholder')}
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="sector" className="label">{t('form.sector')}</label>
                  <select
                    id="sector"
                    className="input mt-1"
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  >
                    <option value="">{t('form.selectSector')}</option>
                    {AVAILABLE_SECTORS.filter(s => s !== 'All WISEs').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="Other">{t('form.other')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="size" className="label">{t('form.organisationSize')}</label>
                  <select
                    id="size"
                    className="input mt-1"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  >
                    <option value="">{t('form.selectSize')}</option>
                    {ORG_SIZES.map((s) => (
                      <option key={s} value={s}>{s} {t('form.employees')}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="legalStructure" className="label">{t('form.legalStructure')}</label>
                  <select
                    id="legalStructure"
                    className="input mt-1"
                    value={form.legalStructure}
                    onChange={(e) => setForm({ ...form, legalStructure: e.target.value })}
                  >
                    <option value="">{t('form.selectStructure')}</option>
                    {(form.country && LEGAL_STRUCTURES_BY_COUNTRY[form.country]
                      ? LEGAL_STRUCTURES_BY_COUNTRY[form.country]
                      : DEFAULT_LEGAL_STRUCTURES
                    ).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || !form.name.trim()}
                  className={`btn-primary ${loading ? 'btn-loading' : ''}`}
                >
                  {loading ? t('home.creating') : t('home.startAssessment')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/resume')}
                  className="btn-secondary"
                >
                  {t('home.resumeExisting')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400">40</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('home.questions')}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('home.questionsDescription')}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">5</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('home.maturityLevels')}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('home.maturityLevelsDescription')}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">PDF</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('home.reports')}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('home.reportsDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
