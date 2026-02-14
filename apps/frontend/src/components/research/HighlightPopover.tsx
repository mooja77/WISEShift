import { useEffect, useRef } from 'react';
import type { ResearchTag } from '@wiseshift/shared';
import TagChip from './TagChip';

interface Props {
  tags: ResearchTag[];
  position: { x: number; y: number };
  onSelect: (tagId: string) => void;
  onClose: () => void;
}

export default function HighlightPopover({ tags, position, onSelect, onClose }: Props) {
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

  if (tags.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-gray-500">No tags yet. Create tags in the sidebar first.</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 max-w-xs rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-1.5 text-xs font-medium text-gray-600">Apply tag:</p>
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
