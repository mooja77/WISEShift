import type { ResearchTag } from '@wiseshift/shared';
import CodeTree from './CodeTree';

interface Props {
  tags: ResearchTag[];
  onTagsChange: () => void;
}

export default function TagPalette({ tags, onTagsChange }: Props) {
  return <CodeTree tags={tags} onTagsChange={onTagsChange} />;
}
