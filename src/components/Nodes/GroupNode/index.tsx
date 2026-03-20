import './styles.css';

import type { NodeProps } from '@xyflow/react';
import { type ComponentType, memo } from 'react';

import type { ReactflowGroupNode } from '@/data/types';

export const GroupNode: ComponentType<NodeProps<ReactflowGroupNode>> = memo(
  ({ data }) => {
    return (
      <div className="group-node">
        <div className="group-label">{data.label}</div>
      </div>
    );
  },
);

GroupNode.displayName = 'GroupNode';
