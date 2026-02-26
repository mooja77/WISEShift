import { useState, useCallback, useRef, useEffect } from 'react';
import type { ResearchTag, TagTreeNode } from '@wiseshift/shared';
import { TAG_COLORS } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  tags: ResearchTag[];
  onTagsChange: () => void;
}

// ─── Build tree from flat tags ───
function buildTree(tags: ResearchTag[]): TagTreeNode[] {
  const map = new Map<string, TagTreeNode>();
  for (const t of tags) {
    map.set(t.id, {
      ...t,
      children: [],
      highlightCount: 0,
    });
  }
  const roots: TagTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── Inline Create Form ───
function InlineCreateForm({
  parentId,
  onDone,
}: {
  parentId: string | null;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await researchApi.createTag({
        name: name.trim(),
        color,
        ...(parentId ? { parentId } : {}),
      } as any);
      onDone();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create theme';
      toast.error(msg);
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ml-5 mt-1 mb-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 space-y-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Theme name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="input w-full text-xs"
        maxLength={100}
      />
      <div className="flex flex-wrap gap-1">
        {TAG_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-5 w-5 rounded-full border-2 transition-transform ${
              color === c ? 'scale-110 border-gray-800 dark:border-gray-200' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Select colour ${c}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="btn-primary text-xs py-1 px-3"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Inline Edit Form ───
function InlineEditForm({
  tag,
  onDone,
}: {
  tag: ResearchTag;
  onDone: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await researchApi.updateTag(tag.id, { name: name.trim(), color });
      onDone();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update theme';
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-1 mb-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="input w-full text-xs"
        maxLength={100}
      />
      <div className="flex flex-wrap gap-1">
        {TAG_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-5 w-5 rounded-full border-2 transition-transform ${
              color === c ? 'scale-110 border-gray-800 dark:border-gray-200' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Select colour ${c}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn-primary text-xs py-1 px-3"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Kebab Menu ───
function KebabMenu({
  tag,
  hasChildren,
  isChild,
  onAddChild,
  onEdit,
  onMoveToRoot,
  onDelete,
}: {
  tag: ResearchTag;
  hasChildren: boolean;
  isChild: boolean;
  onAddChild: () => void;
  onEdit: () => void;
  onMoveToRoot: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={e => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
        aria-label={`Options for ${tag.name}`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
          <button
            onClick={() => { setOpen(false); onAddChild(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add sub-theme
          </button>
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
            </svg>
            Edit
          </button>
          {isChild && (
            <button
              onClick={() => { setOpen(false); onMoveToRoot(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25 0H21m-5.25 0L12 9.75M15.75 13.5 12 17.25" />
              </svg>
              Move to top level
            </button>
          )}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete{hasChildren ? ' (children kept)' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Dialog ───
function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-all duration-150"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tree Node ───
function TreeNode({
  node,
  level,
  treeData,
  draggedId,
  dropTargetId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRefresh,
}: {
  node: TagTreeNode;
  level: number;
  treeData: TagTreeNode[];
  draggedId: string | null;
  dropTargetId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasChildren = node.children.length > 0;
  const isChild = node.parentId != null;
  const isDropTarget = dropTargetId === node.id && draggedId !== node.id;

  const handleMoveToRoot = async () => {
    try {
      await researchApi.updateTag(node.id, { parentId: null } as any);
      toast.success(`"${node.name}" moved to top level`);
      onRefresh();
    } catch {
      toast.error('Failed to move theme');
    }
  };

  const handleDelete = async () => {
    try {
      await researchApi.deleteTag(node.id);
      toast.success(`"${node.name}" deleted`);
      onRefresh();
    } catch {
      toast.error('Failed to delete theme');
    }
    setConfirmDelete(false);
  };

  if (showEdit) {
    return (
      <div style={{ paddingLeft: level * 20 }}>
        <InlineEditForm
          tag={node}
          onDone={() => {
            setShowEdit(false);
            onRefresh();
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(node.id);
        }}
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOver(node.id);
        }}
        onDrop={e => {
          e.preventDefault();
          onDrop(node.id);
        }}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1 transition-all duration-150 cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-gray-800 ${
          isDropTarget ? 'border-l-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: level * 20 + 8 }}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex-shrink-0 rounded p-0.5 transition-all duration-150 ${
            hasChildren ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300' : 'invisible'
          }`}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Colour dot */}
        <span
          className="h-[6px] w-[6px] flex-shrink-0 rounded-full"
          style={{ backgroundColor: node.color }}
        />

        {/* Tag name */}
        <span className="flex-1 truncate text-xs font-medium text-gray-800 dark:text-gray-200">
          {node.name}
        </span>

        {/* Highlight count badge */}
        {node.highlightCount > 0 && (
          <span className="flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {node.highlightCount}
          </span>
        )}

        {/* Kebab menu */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <KebabMenu
            tag={node}
            hasChildren={hasChildren}
            isChild={isChild}
            onAddChild={() => setShowAddChild(true)}
            onEdit={() => setShowEdit(true)}
            onMoveToRoot={handleMoveToRoot}
            onDelete={() => setConfirmDelete(true)}
          />
        </div>
      </div>

      {/* Inline create form for sub-theme */}
      {showAddChild && (
        <div style={{ paddingLeft: (level + 1) * 20 }}>
          <InlineCreateForm
            parentId={node.id}
            onDone={() => {
              setShowAddChild(false);
              onRefresh();
            }}
          />
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              treeData={treeData}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${node.name}"?`}
          message={
            hasChildren
              ? `This theme has ${node.children.length} sub-theme(s). They will be moved to the top level. All highlights using this theme will also be removed.`
              : 'All highlights using this theme will also be removed. This cannot be undone.'
          }
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

// ─── Main CodeTree Component ───
export default function CodeTree({ tags, onTagsChange }: Props) {
  const [treeData, setTreeData] = useState<TagTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRootCreate, setShowRootCreate] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Fetch tree with highlight counts
  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await researchApi.getTagTree();
      setTreeData(res.data.data);
    } catch {
      // Fallback: build tree from flat tags (no highlight counts)
      setTreeData(buildTree(tags));
    } finally {
      setLoading(false);
    }
  }, [tags]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleRefresh = useCallback(() => {
    fetchTree();
    onTagsChange();
  }, [fetchTree, onTagsChange]);

  const handleSeedDefaults = async () => {
    try {
      await researchApi.seedDefaultTags();
      toast.success('Default themes loaded');
      handleRefresh();
    } catch {
      toast.error('Failed to load defaults');
    }
  };

  // ─── Drag and drop handlers ───
  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((id: string) => {
    setDropTargetId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
  }, []);

  // Helper: find a node in the tree
  const findNode = useCallback((nodes: TagTreeNode[], id: string): TagTreeNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }, []);

  // Helper: check if target is a descendant of source
  const isDescendant = useCallback((nodes: TagTreeNode[], sourceId: string, targetId: string): boolean => {
    const source = findNode(nodes, sourceId);
    if (!source) return false;
    const check = (children: TagTreeNode[]): boolean => {
      for (const c of children) {
        if (c.id === targetId) return true;
        if (check(c.children)) return true;
      }
      return false;
    };
    return check(source.children);
  }, [findNode]);

  const handleDrop = useCallback(async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }

    // Prevent dropping a parent onto its own descendant
    if (isDescendant(treeData, draggedId, targetId)) {
      toast.error('Cannot move a theme into its own sub-theme');
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }

    try {
      await researchApi.updateTag(draggedId, { parentId: targetId } as any);
      toast.success('Theme moved');
      handleRefresh();
    } catch {
      toast.error('Failed to move theme');
    }
    setDraggedId(null);
    setDropTargetId(null);
  }, [draggedId, treeData, isDescendant, handleRefresh]);

  // Handle drop on the root zone (move to top level)
  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId) return;

    const node = findNode(treeData, draggedId);
    if (node && node.parentId) {
      try {
        await researchApi.updateTag(draggedId, { parentId: null } as any);
        toast.success('Theme moved to top level');
        handleRefresh();
      } catch {
        toast.error('Failed to move theme');
      }
    }
    setDraggedId(null);
    setDropTargetId(null);
  }, [draggedId, treeData, findNode, handleRefresh]);

  const allEmpty = tags.length === 0 && treeData.length === 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Code Tree
      </h3>

      {loading && treeData.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">Loading...</p>
      ) : allEmpty ? (
        <div className="text-center py-3 space-y-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">No themes yet</p>
          <button
            onClick={handleSeedDefaults}
            className="btn-secondary text-xs py-1 px-3"
          >
            Load Defaults
          </button>
        </div>
      ) : (
        <div
          className="space-y-0.5"
          onDragOver={e => {
            e.preventDefault();
            setDropTargetId(null);
          }}
          onDrop={handleRootDrop}
        >
          {treeData.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              treeData={treeData}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Inline create form for root-level theme */}
      {showRootCreate && (
        <InlineCreateForm
          parentId={null}
          onDone={() => {
            setShowRootCreate(false);
            handleRefresh();
          }}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setShowRootCreate(!showRootCreate)}
          className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-medium"
        >
          + New Theme
        </button>
        {!allEmpty && tags.length === 0 && (
          <button
            onClick={handleSeedDefaults}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Load Defaults
          </button>
        )}
      </div>
    </div>
  );
}
