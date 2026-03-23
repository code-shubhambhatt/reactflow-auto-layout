import type {
  Reactflow,
  ReactflowGroupNode,
  WorkflowGroup,
} from '@/data/types';

import { getNodeSize } from './metadata';

const kGroupPadding = {
  top: 44,
  right: 24,
  bottom: 24,
  left: 24,
};

const getFallbackLabel = (groupId: string) => {
  return groupId
    .replace(/^group-/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getWorkflowGroups = (workflow: Reactflow): WorkflowGroup[] => {
  if (workflow.groups?.length) {
    return workflow.groups;
  }

  const groupIds = new Set<string>();
  for (const node of workflow.nodes) {
    if ('isGroup' in node.data && node.data.isGroup) {
      continue;
    }
    for (const groupId of node.data.groups ?? []) {
      groupIds.add(groupId);
    }
  }

  return [...groupIds].map((id) => ({
    id,
    label: getFallbackLabel(id),
  }));
};

export const withGroupNodes = (workflow: Reactflow): Reactflow => {
  const serviceNodes = workflow.nodes.filter((node) => {
    return !('isGroup' in node.data && node.data.isGroup);
  });
  const groups = getWorkflowGroups({ ...workflow, nodes: serviceNodes });

  const groupNodes: ReactflowGroupNode[] = groups.flatMap((group) => {
    const childNodes = serviceNodes.filter((node) => {
      return node.data.groups?.includes(group.id);
    });

    if (!childNodes.length) {
      return [];
    }

    const bounds = childNodes.reduce(
      (acc, node) => {
        const { widthWithDefault, heightWithDefault } = getNodeSize(node);
        acc.left = Math.min(acc.left, node.position.x);
        acc.top = Math.min(acc.top, node.position.y);
        acc.right = Math.max(acc.right, node.position.x + widthWithDefault);
        acc.bottom = Math.max(acc.bottom, node.position.y + heightWithDefault);
        return acc;
      },
      {
        left: Number.POSITIVE_INFINITY,
        top: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY,
      },
    );

    return [
      {
        id: `group-node-${group.id}`,
        type: 'group',
        position: {
          x: bounds.left - kGroupPadding.left,
          y: bounds.top - kGroupPadding.top,
        },
        width:
          bounds.right - bounds.left + kGroupPadding.left + kGroupPadding.right,
        height:
          bounds.bottom - bounds.top + kGroupPadding.top + kGroupPadding.bottom,
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
        style: {
          zIndex: -1,
          pointerEvents: 'none',
        },
        data: {
          ...group,
          childNodeIds: childNodes.map((node) => node.id),
          ports: [],
          isGroup: true,
        },
      },
    ];
  });

  return {
    ...workflow,
    nodes: [...groupNodes, ...serviceNodes],
  };
};
