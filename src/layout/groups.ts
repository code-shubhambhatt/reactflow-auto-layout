import type {
  Reactflow,
  ReactflowComputedGroupLayout,
  ReactflowGroupNode,
  ReactflowNodeWithData,
  WorkflowGroup,
} from '@/data/types';

import { getNodeSize } from './metadata';

const kGroupPadding = {
  top: 44,
  right: 24,
  bottom: 24,
  left: 24,
};

const kSiblingGap = 48;

const getFallbackLabel = (groupId: string) => {
  return groupId
    .replace(/^group-/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const isGroupNode = (node: Reactflow['nodes'][number]) => {
  return 'isGroup' in node.data && node.data.isGroup;
};

type GroupRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OrderedWorkflowGroup = WorkflowGroup & {
  order: number;
};

export type NormalizedWorkflowGroup = OrderedWorkflowGroup & {
  childGroupIds: string[];
  directNodeIds: string[];
  depth: number;
  parentId?: string;
};

const getWorkflowGroups = (
  workflow: Reactflow,
  serviceNodes: ReactflowNodeWithData[],
): OrderedWorkflowGroup[] => {
  const groupsById = new Map<string, WorkflowGroup>();

  for (const group of workflow.groups ?? []) {
    groupsById.set(group.id, {
      ...group,
      label: group.label ?? getFallbackLabel(group.id),
    });
  }

  for (const node of serviceNodes) {
    for (const groupId of node.data.groups ?? []) {
      if (groupsById.has(groupId)) {
        continue;
      }

      groupsById.set(groupId, {
        id: groupId,
        label: getFallbackLabel(groupId),
      });
    }
  }

  return [...groupsById.values()].map((group, index) => ({
    ...group,
    order: index,
  }));
};

export const normalizeWorkflowGroups = (
  workflow: Reactflow,
  serviceNodes: ReactflowNodeWithData[],
) => {
  const groups = getWorkflowGroups(workflow, serviceNodes);
  const normalizedGroups = new Map<string, NormalizedWorkflowGroup>();
  const parentByChildId = new Map<string, string>();

  for (const group of groups) {
    normalizedGroups.set(group.id, {
      ...group,
      childGroupIds: [],
      directNodeIds: [],
      depth: 0,
      parentId: undefined,
    });
  }

  for (const node of serviceNodes) {
    const groupPath = (node.data.groups ?? []).filter((groupId) =>
      normalizedGroups.has(groupId),
    );

    for (let index = 0; index < groupPath.length - 1; index += 1) {
      const parentId = groupPath[index];
      const childId = groupPath[index + 1];
      const currentParentId = parentByChildId.get(childId);

      if (currentParentId && currentParentId !== parentId) {
        console.warn(
          `[groups] conflicting hierarchy for "${childId}": "${currentParentId}" vs "${parentId}"`,
        );
        continue;
      }

      parentByChildId.set(childId, parentId);
    }
  }

  for (const [childId, parentId] of parentByChildId.entries()) {
    const childGroup = normalizedGroups.get(childId);
    if (childGroup) {
      childGroup.parentId = parentId;
    }
    normalizedGroups.get(parentId)?.childGroupIds.push(childId);
  }

  const depthCache = new Map<string, number>();
  const getDepth = (groupId: string, stack = new Set<string>()): number => {
    if (depthCache.has(groupId)) {
      return depthCache.get(groupId)!;
    }

    if (stack.has(groupId)) {
      return 0;
    }

    stack.add(groupId);
    const parentId = parentByChildId.get(groupId);
    const depth = parentId ? getDepth(parentId, stack) + 1 : 0;
    depthCache.set(groupId, depth);
    stack.delete(groupId);
    return depth;
  };

  for (const group of normalizedGroups.values()) {
    group.depth = getDepth(group.id);
    group.childGroupIds.sort((leftId, rightId) => {
      const left = normalizedGroups.get(leftId);
      const right = normalizedGroups.get(rightId);
      return (left?.order ?? 0) - (right?.order ?? 0);
    });
  }

  for (const node of serviceNodes) {
    const directGroupId = [...(node.data.groups ?? [])]
      .reverse()
      .find((groupId) => normalizedGroups.has(groupId));

    if (directGroupId) {
      normalizedGroups.get(directGroupId)?.directNodeIds.push(node.id);
    }
  }

  return normalizedGroups;
};

const getNodeBounds = (node: ReactflowNodeWithData): GroupRect => {
  const { widthWithDefault, heightWithDefault } = getNodeSize(node);
  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + widthWithDefault,
    bottom: node.position.y + heightWithDefault,
  };
};

const getGroupRects = (
  normalizedGroups: Map<string, NormalizedWorkflowGroup>,
  serviceNodesById: Map<string, ReactflowNodeWithData>,
) => {
  const groupRects = new Map<string, GroupRect>();

  const getGroupRect = (groupId: string): GroupRect | undefined => {
    if (groupRects.has(groupId)) {
      return groupRects.get(groupId);
    }

    const group = normalizedGroups.get(groupId);
    if (!group) {
      return undefined;
    }

    const childRects = [
      ...group.directNodeIds
        .map((nodeId) => serviceNodesById.get(nodeId))
        .filter((node): node is ReactflowNodeWithData => !!node)
        .map(getNodeBounds),
      ...group.childGroupIds
        .map((childGroupId) => getGroupRect(childGroupId))
        .filter((rect): rect is GroupRect => !!rect),
    ];

    if (!childRects.length) {
      return undefined;
    }

    const bounds = childRects.reduce(
      (acc, rect) => ({
        left: Math.min(acc.left, rect.left),
        top: Math.min(acc.top, rect.top),
        right: Math.max(acc.right, rect.right),
        bottom: Math.max(acc.bottom, rect.bottom),
      }),
      {
        left: Number.POSITIVE_INFINITY,
        top: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY,
      },
    );

    const rect = {
      left: bounds.left - kGroupPadding.left,
      top: bounds.top - kGroupPadding.top,
      right: bounds.right + kGroupPadding.right,
      bottom: bounds.bottom + kGroupPadding.bottom,
    };

    groupRects.set(groupId, rect);
    return rect;
  };

  for (const groupId of normalizedGroups.keys()) {
    getGroupRect(groupId);
  }

  return groupRects;
};

const shiftNode = (node: ReactflowNodeWithData, delta: GroupRect) => {
  node.position = {
    x: node.position.x + delta.left,
    y: node.position.y + delta.top,
  };
};

const shiftGroupDescendants = (
  groupId: string,
  normalizedGroups: Map<string, NormalizedWorkflowGroup>,
  serviceNodesById: Map<string, ReactflowNodeWithData>,
  delta: GroupRect,
) => {
  const group = normalizedGroups.get(groupId);
  if (!group) {
    return;
  }

  for (const nodeId of group.directNodeIds) {
    const node = serviceNodesById.get(nodeId);
    if (node) {
      shiftNode(node, delta);
    }
  }

  for (const childGroupId of group.childGroupIds) {
    shiftGroupDescendants(
      childGroupId,
      normalizedGroups,
      serviceNodesById,
      delta,
    );
  }
};

type PackItem =
  | {
      kind: 'group';
      id: string;
    }
  | {
      kind: 'node';
      id: string;
    };

const packGroups = (
  normalizedGroups: Map<string, NormalizedWorkflowGroup>,
  serviceNodesById: Map<string, ReactflowNodeWithData>,
  layoutDirection: NonNullable<Reactflow['layoutDirection']>,
) => {
  const getNodeRect = (nodeId: string) => {
    const node = serviceNodesById.get(nodeId);
    return node ? getNodeBounds(node) : undefined;
  };

  const getRect = (
    item: PackItem,
    groupRects: Map<string, GroupRect>,
  ): GroupRect | undefined => {
    return item.kind === 'group'
      ? groupRects.get(item.id)
      : getNodeRect(item.id);
  };

  const shiftItem = (item: PackItem, delta: number) => {
    const shiftRect =
      layoutDirection === 'horizontal'
        ? { left: delta, top: 0, right: 0, bottom: 0 }
        : { left: 0, top: delta, right: 0, bottom: 0 };

    if (item.kind === 'group') {
      shiftGroupDescendants(
        item.id,
        normalizedGroups,
        serviceNodesById,
        shiftRect,
      );
      return;
    }

    const node = serviceNodesById.get(item.id);
    if (node) {
      shiftNode(node, shiftRect);
    }
  };

  const packContainer = (parentGroupId?: string) => {
    const childGroupIds = parentGroupId
      ? (normalizedGroups.get(parentGroupId)?.childGroupIds ?? [])
      : [...normalizedGroups.values()]
          .filter((group) => !group.parentId)
          .sort((left, right) => left.order - right.order)
          .map((group) => group.id);

    for (const childGroupId of childGroupIds) {
      packContainer(childGroupId);
    }

    const directNodeIds = parentGroupId
      ? (normalizedGroups.get(parentGroupId)?.directNodeIds ?? [])
      : [];

    const items = [
      ...directNodeIds.map(
        (id) =>
          ({
            kind: 'node',
            id,
          }) as PackItem,
      ),
      ...childGroupIds.map(
        (id) =>
          ({
            kind: 'group',
            id,
          }) as PackItem,
      ),
    ];

    if (items.length < 2) {
      return;
    }

    let groupRects = getGroupRects(normalizedGroups, serviceNodesById);
    const getPrimaryStart = (rect: GroupRect) =>
      layoutDirection === 'horizontal' ? rect.left : rect.top;
    const getPrimaryEnd = (rect: GroupRect) =>
      layoutDirection === 'horizontal' ? rect.right : rect.bottom;
    const getSecondaryStart = (rect: GroupRect) =>
      layoutDirection === 'horizontal' ? rect.top : rect.left;

    items.sort((left, right) => {
      const leftRect = getRect(left, groupRects);
      const rightRect = getRect(right, groupRects);

      if (!leftRect || !rightRect) {
        return 0;
      }

      const primaryDiff =
        getPrimaryStart(leftRect) - getPrimaryStart(rightRect);
      if (primaryDiff !== 0) {
        return primaryDiff;
      }

      return getSecondaryStart(leftRect) - getSecondaryStart(rightRect);
    });

    let cursor = Number.NEGATIVE_INFINITY;
    for (const item of items) {
      groupRects = getGroupRects(normalizedGroups, serviceNodesById);
      const rect = getRect(item, groupRects);
      if (!rect) {
        continue;
      }

      const start = getPrimaryStart(rect);
      const desiredStart =
        cursor === Number.NEGATIVE_INFINITY ? start : cursor + kSiblingGap;

      if (start < desiredStart) {
        shiftItem(item, desiredStart - start);
        groupRects = getGroupRects(normalizedGroups, serviceNodesById);
      }

      const packedRect = getRect(item, groupRects);
      if (!packedRect) {
        continue;
      }
      cursor = getPrimaryEnd(packedRect);
    }
  };

  packContainer(undefined);
};

export const getDescendantNodeIds = (
  groupId: string,
  normalizedGroups: Map<string, NormalizedWorkflowGroup>,
): string[] => {
  const group = normalizedGroups.get(groupId);
  if (!group) {
    return [];
  }

  return [
    ...group.directNodeIds,
    ...group.childGroupIds.flatMap((childGroupId) =>
      getDescendantNodeIds(childGroupId, normalizedGroups),
    ),
  ];
};

const buildComputedGroupNodes = (
  computedGroupLayouts: ReactflowComputedGroupLayout[],
  visibility: string | undefined,
): ReactflowGroupNode[] => {
  return computedGroupLayouts
    .slice()
    .sort((left, right) => left.depth - right.depth)
    .map((group) => ({
      id: `group-node-${group.id}`,
      type: 'group',
      position: {
        ...group.position,
      },
      width: group.width,
      height: group.height,
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
      focusable: false,
      style: {
        zIndex: -1000 + group.depth,
        pointerEvents: 'none',
        visibility,
      },
      data: {
        ...group,
        ports: [],
        isGroup: true,
      },
    }));
};

export const withGroupNodes = (workflow: Reactflow): Reactflow => {
  const serviceNodes = workflow.nodes
    .filter((node): node is ReactflowNodeWithData => !isGroupNode(node))
    .map((node) => ({
      ...node,
      position: {
        ...node.position,
      },
    }));
  const normalizedGroups = normalizeWorkflowGroups(
    { ...workflow, nodes: serviceNodes },
    serviceNodes,
  );
  const serviceNodesById = new Map(serviceNodes.map((node) => [node.id, node]));
  const layoutDirection = workflow.layoutDirection ?? 'horizontal';
  const visibility =
    serviceNodes[0]?.style?.visibility ?? workflow.nodes[0]?.style?.visibility;

  if (workflow.computedGroupLayouts?.length) {
    return {
      ...workflow,
      nodes: [
        ...buildComputedGroupNodes(workflow.computedGroupLayouts, visibility),
        ...serviceNodes,
      ],
    };
  }

  packGroups(normalizedGroups, serviceNodesById, layoutDirection);

  const groupRects = getGroupRects(normalizedGroups, serviceNodesById);

  const groupNodes: ReactflowGroupNode[] = [...normalizedGroups.values()]
    .sort((left, right) => left.depth - right.depth || left.order - right.order)
    .flatMap((group) => {
      const rect = groupRects.get(group.id);
      if (!rect) {
        return [];
      }

      return [
        {
          id: `group-node-${group.id}`,
          type: 'group',
          position: {
            x: rect.left,
            y: rect.top,
          },
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
          draggable: false,
          selectable: false,
          connectable: false,
          deletable: false,
          focusable: false,
          style: {
            zIndex: -1000 + group.depth,
            pointerEvents: 'none',
            visibility,
          },
          data: {
            ...group,
            childNodeIds: getDescendantNodeIds(group.id, normalizedGroups),
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
