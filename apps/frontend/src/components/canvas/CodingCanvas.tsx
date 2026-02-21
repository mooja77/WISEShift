import { useCanvasStore } from '../../stores/canvasStore';
import CanvasListPanel from './panels/CanvasListPanel';
import CanvasWorkspace from './CanvasWorkspace';

export default function CodingCanvas() {
  const { activeCanvasId } = useCanvasStore();

  if (activeCanvasId) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[500px]">
        <CanvasWorkspace />
      </div>
    );
  }

  return <CanvasListPanel />;
}
