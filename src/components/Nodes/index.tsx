import type { NodeTypes } from '@xyflow/react';

import { BaseNode } from './BaseNode';
import { GroupNode } from './GroupNode';

export const kNodeTypes: NodeTypes = {
  base: BaseNode,
  group: GroupNode,
};
