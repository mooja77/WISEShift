import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useCanvasStore } from '../../../stores/canvasStore';

interface RelationEdgeData {
  relationId: string;
  label: string;
  [key: string]: unknown;
}

export default function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeData = data as unknown as RelationEdgeData;
  const { deleteRelation } = useCanvasStore();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: '#94A3B8', strokeWidth: 1.5, strokeDasharray: '6 3' }}
      />
      <foreignObject
        width={120}
        height={28}
        x={labelX - 60}
        y={labelY - 14}
        className="pointer-events-auto"
      >
        <div className="flex items-center justify-center gap-1">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 shadow-sm border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
            {edgeData?.label || 'relates to'}
          </span>
          <button
            onClick={() => edgeData?.relationId && deleteRelation(edgeData.relationId)}
            className="rounded-full bg-white p-0.5 text-gray-300 hover:text-red-500 shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
            title="Delete relation"
          >
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </foreignObject>
    </>
  );
}
