import { getIncomers, Position } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';

import type {
  ReactflowComputedGroupLayout,
  ReactflowNodeWithData,
} from '@/data/types';
import { getDescendantNodeIds, normalizeWorkflowGroups } from '@/layout/groups';
import { getHandlePosition } from '@/layout/ports';

import { getEdgeLayouted, getNodeLayouted, getNodeSize } from '../../metadata';
import type { LayoutAlgorithm, LayoutAlgorithmProps } from '..';

const algorithms = {
  'elk-layered': 'layered',
  'elk-mr-tree': 'mrtree',
};

const elk = new ELK({ algorithms: Object.values(algorithms) });

const getElkPortSide = (position: Position) => {
  switch (position) {
    case Position.Top:
      return 'NORTH';
    case Position.Right:
      return 'EAST';
    case Position.Bottom:
      return 'SOUTH';
    case Position.Left:
      return 'WEST';
  }
};

export type ELKLayoutAlgorithms = 'elk-layered' | 'elk-mr-tree';

const kElkGroupIdPrefix = '__group__::';

const getElkGroupId = (groupId: string) => {
  return `${kElkGroupIdPrefix}${groupId}`;
};

export const layoutELK = async (
  props: LayoutAlgorithmProps & { algorithm?: ELKLayoutAlgorithms },
) => {
  const {
    nodes,
    edges,
    groups,
    direction,
    visibility,
    spacing,
    algorithm = 'elk-mr-tree',
  } = props;

  const subWorkflowRootNodes: ReactflowNodeWithData[] = [];
  const serviceNodesById = new Map(nodes.map((node) => [node.id, node]));
  const createElkNode = (node: ReactflowNodeWithData) => {
    const incomers = getIncomers(node, nodes, edges);
    if (incomers.length < 1) {
      // Node without input is the root node of sub-workflow
      subWorkflowRootNodes.push(node);
    }
    const { widthWithDefault, heightWithDefault } = getNodeSize(node);
    const ports = node.data.ports.map((id, index) => ({
      id,
      properties: {
        side: getElkPortSide(getHandlePosition('source', index, id)),
      },
    }));
    return {
      id: node.id,
      width: widthWithDefault,
      height: heightWithDefault,
      ports,
      properties: {
        'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
      },
    };
  };

  const normalizedGroups = normalizeWorkflowGroups(
    {
      nodes,
      edges,
      groups,
    },
    nodes,
  );

  const createElkGroupNode = (groupId: string): any => {
    const group = normalizedGroups.get(groupId)!;
    return {
      id: getElkGroupId(group.id),
      children: [
        ...group.childGroupIds.map((childGroupId) =>
          createElkGroupNode(childGroupId),
        ),
        ...group.directNodeIds
          .map((nodeId) => serviceNodesById.get(nodeId))
          .filter((node): node is ReactflowNodeWithData => !!node)
          .map((node) => createElkNode(node)),
      ],
      layoutOptions: {
        'elk.padding': `[top=44,left=24,bottom=24,right=24]`,
        'elk.spacing.nodeNode':
          direction === 'horizontal'
            ? spacing.y.toString()
            : spacing.x.toString(),
        'elk.layered.spacing.nodeNodeBetweenLayers':
          direction === 'horizontal'
            ? spacing.x.toString()
            : spacing.y.toString(),
      },
    };
  };

  const topLevelGroupIds = [...normalizedGroups.values()]
    .filter((group) => !group.parentId)
    .sort((left, right) => left.order - right.order)
    .map((group) => group.id);
  const groupedNodeIds = new Set<string>();
  for (const group of normalizedGroups.values()) {
    for (const nodeId of group.directNodeIds) {
      groupedNodeIds.add(nodeId);
    }
  }

  const layoutNodes = [
    ...topLevelGroupIds.map((groupId) => createElkGroupNode(groupId)),
    ...nodes
      .filter((node) => !groupedNodeIds.has(node.id))
      .map((node) => createElkNode(node)),
  ];

  const layoutEdges = edges.map((edge) => {
    return {
      id: edge.id,
      sources: [edge.sourceHandle || edge.source],
      targets: [edge.targetHandle || edge.target],
    };
  });

  // Connect sub-workflows' root nodes to the rootNode
  const rootNode: any = { id: '#root', width: 1, height: 1 };
  layoutNodes.push(rootNode);
  for (const subWorkflowRootNode of subWorkflowRootNodes) {
    layoutEdges.push({
      id: `${rootNode.id}-${subWorkflowRootNode.id}`,
      sources: [rootNode.id],
      targets: [subWorkflowRootNode.id],
    });
  }

  const layouted = await elk
    .layout({
      id: '@root',
      children: layoutNodes,
      edges: layoutEdges,
      layoutOptions: {
        // - https://www.eclipse.org/elk/reference/algorithms.html
        'elk.algorithm': algorithms[algorithm],
        'elk.direction': direction === 'horizontal' ? 'RIGHT' : 'DOWN',
        // - https://www.eclipse.org/elk/reference/options.html
        'elk.spacing.nodeNode':
          direction === 'horizontal'
            ? spacing.y.toString()
            : spacing.x.toString(),
        'elk.layered.spacing.nodeNodeBetweenLayers':
          direction === 'horizontal'
            ? spacing.x.toString()
            : spacing.y.toString(),
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      },
    })
    .catch((e) => {
      console.log('Ã¢ÂÅ’ ELK layout failed', e);
    });

  if (!layouted?.children) {
    return;
  }

  const layoutedNodePositions: Record<string, { x: number; y: number }> = {};
  const computedGroupLayouts: ReactflowComputedGroupLayout[] = [];

  const visitLayout = (currentNode: any, parentPosition = { x: 0, y: 0 }) => {
    const absolutePosition = {
      x: parentPosition.x + (currentNode.x ?? 0),
      y: parentPosition.y + (currentNode.y ?? 0),
    };

    if (currentNode.id?.startsWith(kElkGroupIdPrefix)) {
      const groupId = currentNode.id.slice(kElkGroupIdPrefix.length);
      const group = normalizedGroups.get(groupId);
      if (group) {
        computedGroupLayouts.push({
          id: group.id,
          label: group.label,
          typeId: group.typeId,
          childNodeIds: getDescendantNodeIds(group.id, normalizedGroups),
          depth: group.depth,
          position: absolutePosition,
          width: currentNode.width ?? 0,
          height: currentNode.height ?? 0,
        });
      }
    } else if (serviceNodesById.has(currentNode.id)) {
      layoutedNodePositions[currentNode.id] = absolutePosition;
    }

    for (const child of currentNode.children ?? []) {
      visitLayout(child, absolutePosition);
    }
  };

  for (const child of layouted.children) {
    visitLayout(child);
  }

  return {
    nodes: nodes.map((node) => {
      const position = layoutedNodePositions[node.id];
      return getNodeLayouted({ node, position, direction, visibility });
    }),
    edges: edges.map((edge) => getEdgeLayouted({ edge, visibility })),
    groups,
    computedGroupLayouts,
  };
};

export const kElkAlgorithms: Record<string, LayoutAlgorithm> = Object.keys(
  algorithms,
).reduce((pre, algorithm) => {
  pre[algorithm] = (props: any) => {
    return layoutELK({ ...props, algorithm });
  };
  return pre;
}, {} as any);
