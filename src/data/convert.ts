import {
  getFixedHandleIdForEdge,
  getFixedHandleIds,
  getHandleIndex,
  normalizePortId,
} from '@/layout/ports';

import type {
  Reactflow,
  ReactflowEdgeWithData,
  ReactflowNodeWithData,
  Workflow,
} from './types';

type EdgeLike = Pick<
  ReactflowEdgeWithData,
  'id' | 'source' | 'target' | 'sourceHandle' | 'targetHandle' | 'label'
> &
  Partial<ReactflowEdgeWithData>;

type NodeLike = Pick<ReactflowNodeWithData, 'id'>;

const getNodePorts = (nodes: NodeLike[]) => {
  return nodes.reduce(
    (handles, node) => {
      handles[node.id] = {
        ports: getFixedHandleIds(node.id, 'source'),
      };
      return handles;
    },
    {} as Record<
      string,
      {
        ports: string[];
      }
    >,
  );
};

export const decorateReactflowEdges = (
  nodes: NodeLike[],
  edges: EdgeLike[],
): ReactflowEdgeWithData[] => {
  const nodeHandles = getNodePorts(nodes);
  const edgesCount: Record<string, number> = {};
  const edgesIndex: Record<string, { source: number; target: number }> = {};
  const sourceEdgesByNode: Record<string, number> = {};
  const targetEdgesByNode: Record<string, number> = {};

  const normalizedEdges = edges.map((edge) => {
    const sourceIndex = sourceEdgesByNode[edge.source] ?? 0;
    const targetIndex = targetEdgesByNode[edge.target] ?? 0;
    const sourceHandle = edge.sourceHandle
      ? normalizePortId(edge.source, 'source', edge.sourceHandle, sourceIndex)
      : getFixedHandleIdForEdge(edge.source, 'source', sourceIndex);
    const targetHandle = edge.targetHandle
      ? normalizePortId(edge.target, 'target', edge.targetHandle, targetIndex)
      : getFixedHandleIdForEdge(edge.target, 'target', targetIndex);

    sourceEdgesByNode[edge.source] = sourceIndex + 1;
    targetEdgesByNode[edge.target] = targetIndex + 1;

    return {
      ...edge,
      type: 'base',
      sourceHandle,
      targetHandle,
    };
  });

  for (const edge of normalizedEdges) {
    const { source, target, sourceHandle, targetHandle } = edge;
    if (!edgesCount[sourceHandle]) {
      edgesCount[sourceHandle] = 1;
    } else {
      edgesCount[sourceHandle] += 1;
    }
    if (!edgesCount[targetHandle]) {
      edgesCount[targetHandle] = 1;
    } else {
      edgesCount[targetHandle] += 1;
    }
    if (!edgesCount[`source-${source}`]) {
      edgesCount[`source-${source}`] = 1;
    } else {
      edgesCount[`source-${source}`] += 1;
    }
    if (!edgesCount[`target-${target}`]) {
      edgesCount[`target-${target}`] = 1;
    } else {
      edgesCount[`target-${target}`] += 1;
    }
    edgesIndex[edge.id] = {
      source: edgesCount[sourceHandle] - 1,
      target: edgesCount[targetHandle] - 1,
    };
  }

  return normalizedEdges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      layout: undefined,
      sourcePort: {
        edges: edgesCount[`source-${edge.source}`],
        portIndex: getHandleIndex('source', edge.sourceHandle),
        portCount: nodeHandles[edge.source]?.ports.length ?? 0,
        edgeIndex: edgesIndex[edge.id].source,
        edgeCount: edgesCount[edge.sourceHandle],
      },
      targetPort: {
        edges: edgesCount[`target-${edge.target}`],
        portIndex: getHandleIndex('target', edge.targetHandle),
        portCount: nodeHandles[edge.target]?.ports.length ?? 0,
        edgeIndex: edgesIndex[edge.id].target,
        edgeCount: edgesCount[edge.targetHandle],
      },
    },
  }));
};

export const workflow2reactflow = (workflow: Workflow): Reactflow => {
  const { nodes = [], edges = [], groups = [] } = workflow ?? {};
  const reactflowNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node,
      ports: getFixedHandleIds(node.id, 'source'),
    },
    position: { x: 0, y: 0 },
  }));

  return {
    nodes: reactflowNodes,
    edges: decorateReactflowEdges(reactflowNodes, edges as EdgeLike[]),
    groups,
  };
};
