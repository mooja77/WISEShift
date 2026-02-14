interface Props {
  name: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'md';
}

export default function TagChip({ name, color, selected, onClick, onDelete, size = 'sm' }: Props) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-all ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      style={{
        backgroundColor: selected ? color : `${color}20`,
        color: selected ? '#fff' : color,
        border: `1px solid ${color}40`,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {name}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
          aria-label={`Delete tag ${name}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
