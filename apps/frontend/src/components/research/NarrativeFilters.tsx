import { useState, useEffect } from 'react';
import type { FilterOptions } from '@wiseshift/shared';
import { DOMAINS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';

interface Props {
  domainKeys: string[];
  countries: string[];
  sectors: string[];
  sizes: string[];
  scoreMin: number | undefined;
  scoreMax: number | undefined;
  onChange: (filters: {
    domainKeys: string[];
    countries: string[];
    sectors: string[];
    sizes: string[];
    scoreMin: number | undefined;
    scoreMax: number | undefined;
  }) => void;
}

export default function NarrativeFilters({ domainKeys, countries, sectors, sizes, scoreMin, scoreMax, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [options, setOptions] = useState<FilterOptions>({ countries: [], sectors: [], sizes: [] });

  useEffect(() => {
    researchApi.getFilterOptions().then(res => setOptions(res.data.data)).catch(() => {});
  }, []);

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const activeCount = domainKeys.length + countries.length + sectors.length + sizes.length
    + (scoreMin !== undefined ? 1 : 0) + (scoreMax !== undefined ? 1 : 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
              {activeCount}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-4">
          {/* Domains */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Domains</p>
            <div className="flex flex-wrap gap-1.5">
              {DOMAINS.map(d => (
                <label key={d.key} className="flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors"
                  style={{
                    borderColor: domainKeys.includes(d.key) ? d.color : '#e5e7eb',
                    backgroundColor: domainKeys.includes(d.key) ? `${d.color}15` : 'white',
                    color: domainKeys.includes(d.key) ? d.color : '#6b7280',
                  }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={domainKeys.includes(d.key)}
                    onChange={() => onChange({ domainKeys: toggleItem(domainKeys, d.key), countries, sectors, sizes, scoreMin, scoreMax })}
                  />
                  {d.shortName}
                </label>
              ))}
            </div>
          </div>

          {/* Country */}
          {options.countries.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Country</p>
              <div className="flex flex-wrap gap-1.5">
                {options.countries.map(c => (
                  <label key={c} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    countries.includes(c) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={countries.includes(c)}
                      onChange={() => onChange({ domainKeys, countries: toggleItem(countries, c), sectors, sizes, scoreMin, scoreMax })} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sector */}
          {options.sectors.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Sector</p>
              <div className="flex flex-wrap gap-1.5">
                {options.sectors.map(s => (
                  <label key={s} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    sectors.includes(s) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={sectors.includes(s)}
                      onChange={() => onChange({ domainKeys, countries, sectors: toggleItem(sectors, s), sizes, scoreMin, scoreMax })} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {options.sizes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Size</p>
              <div className="flex flex-wrap gap-1.5">
                {options.sizes.map(s => (
                  <label key={s} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    sizes.includes(s) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={sizes.includes(s)}
                      onChange={() => onChange({ domainKeys, countries, sectors, sizes: toggleItem(sizes, s), scoreMin, scoreMax })} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Score range */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Score Range</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={5} step={0.5} placeholder="Min"
                value={scoreMin ?? ''}
                onChange={e => onChange({ domainKeys, countries, sectors, sizes, scoreMin: e.target.value ? Number(e.target.value) : undefined, scoreMax })}
                className="input w-20 text-xs"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="number" min={0} max={5} step={0.5} placeholder="Max"
                value={scoreMax ?? ''}
                onChange={e => onChange({ domainKeys, countries, sectors, sizes, scoreMin, scoreMax: e.target.value ? Number(e.target.value) : undefined })}
                className="input w-20 text-xs"
              />
            </div>
          </div>

          {/* Clear */}
          {activeCount > 0 && (
            <button
              onClick={() => onChange({ domainKeys: [], countries: [], sectors: [], sizes: [], scoreMin: undefined, scoreMax: undefined })}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
