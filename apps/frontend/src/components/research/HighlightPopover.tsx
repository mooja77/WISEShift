import { useEffect, useRef, useMemo } from 'react';
import type { ResearchTag } from '@wiseshift/shared';
import TagChip from './TagChip';

interface Props {
  tags: ResearchTag[];
  position: { x: number; y: number };
  onSelect: (tagId: string) => void;
  onClose: () => void;
  onInVivoCode?: (text: string) => void;
  selectedText?: string;
}

interface TagGroup {
  parent: ResearchTag | null;
  children: ResearchTag[];
}

export default function HighlightPopover({ tags, position, onSelect, onClose, onInVivoCode, selectedText }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the mouseup that triggered this
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Determine if tags have hierarchy
  const hasHierarchy = useMemo(() => tags.some(t => t.parentId), [tags]);

  // Build grouped structure: parent tags as section headers, children indented
  const groups = useMemo((): TagGroup[] => {
    if (!hasHierarchy) return [];

    const tagMap = new Map<string, ResearchTag>();
    for (const t of tags) tagMap.set(t.id, t);

    const rootTags: ResearchTag[] = [];
    const childMap = new Map<string, ResearchTag[]>();

    for (const t of tags) {
      if (t.parentId && tagMap.has(t.parentId)) {
        if (!childMap.has(t.parentId)) childMap.set(t.parentId, []);
        childMap.get(t.parentId)!.push(t);
      } else {
        rootTags.push(t);
      }
    }

    return rootTags.map(parent => ({
      parent,
      children: childMap.get(parent.id) || [],
    }));
  }, [tags, hasHierarchy]);

  // In-vivo coding button (shown at top of popover when available)
  const inVivoButton = onInVivoCode && selectedText ? (
    <div className="mb-2">
      <button
        onClick={() => onInVivoCode(selectedText)}
        className="flex w-full items-center gap-2 rounded-lg border border-brand-200 bg-gradient-to-r from-brand-50 to-indigo-50 px-3 py-2 text-left transition-all duration-150 hover:from-brand-100 hover:to-indigo-100 dark:border-brand-700 dark:from-brand-900/30 dark:to-indigo-900/30 dark:hover:from-brand-900/50 dark:hover:to-indigo-900/50"
      >
        {/* Quote marks icon */}
        <svg className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12M2.36 12.76c.04.326.16.624.36.88l6 8a1.5 1.5 0 0 0 2.56 0l6-8c.2-.256.32-.554.36-.88M2.36 12.76A1.5 1.5 0 0 1 2.25 12V6a1.5 1.5 0 0 1 1.5-1.5h16.5a1.5 1.5 0 0 1 1.5 1.5v6c0 .262-.042.518-.11.76" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-700 dark:text-brand-300">Create theme from this text</p>
          <p className="truncate text-xs italic text-brand-600/70 dark:text-brand-400/70">
            &ldquo;{selectedText.length > 40 ? selectedText.slice(0, 40) + '...' : selectedText}&rdquo;
          </p>
        </div>
      </button>
    </div>
  ) : null;

  if (tags.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute z-50 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-lg"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {inVivoButton}
        {!inVivoButton && (
          <p className="text-xs text-gray-500 dark:text-gray-400">No tags yet. Create tags in the sidebar first.</p>
        )}
        {inVivoButton && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Or create tags in the sidebar first.</p>
        )}
      </div>
    );
  }

  // Flat list fallback when no hierarchy exists
  if (!hasHierarchy) {
    return (
      <div
        ref={ref}
        className="absolute z-50 max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {inVivoButton}
        {inVivoButton && (
          <div className="mb-1.5 border-t border-gray-200 pt-1.5 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Or apply existing theme:</p>
          </div>
        )}
        {!inVivoButton && (
          <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">Apply tag:</p>
        )}
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onClick={() => onSelect(tag.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Grouped tree display
  return (
    <div
      ref={ref}
      className="absolute z-50 max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {inVivoButton}
      {inVivoButton && (
        <div className="mb-1.5 border-t border-gray-200 pt-1.5 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Or apply existing theme:</p>
        </div>
      )}
      {!inVivoButton && (
        <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">Apply tag:</p>
      )}
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {groups.map(group => (
          <div key={group.parent?.id || 'ungrouped'}>
            {/* Parent as section header */}
            {group.parent && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <span
                    className="h-[5px] w-[5px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.parent.color }}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {group.parent.name}
                  </span>
                </div>
                {/* Parent is also clickable */}
                <div className="flex flex-wrap gap-1">
                  <TagChip
                    name={group.parent.name}
                    color={group.parent.color}
                    onClick={() => onSelect(group.parent!.id)}
                  />
                </div>
                {/* Children indented */}
                {group.children.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-3 mt-0.5">
                    {group.children.map(child => (
                      <TagChip
                        key={child.id}
                        name={child.name}
                        color={child.color}
                        onClick={() => onSelect(child.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
