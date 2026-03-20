import {
  getFixedHandleIdForEdge,
  getFixedHandleIds,
  getHandleIndex,
} from '@/layout/ports';

import type { Reactflow, Workflow } from './types';

export const workflow2reactflow = (workflow: Workflow): Reactflow => {
  const { nodes = [], edges = [] } = workflow ?? {};
  const edgesCount: Record<string, number> = {};
  const edgesIndex: Record<string, { source: number; target: number }> = {};
  const sourceEdgesByNode: Record<string, number> = {};
  const targetEdgesByNode: Record<string, number> = {};

  const nodeHandles = nodes.reduce(
    (handles, node) => {
      handles[node.id] = {
        sourceHandles: getFixedHandleIds(node.id, 'source'),
        targetHandles: getFixedHandleIds(node.id, 'target'),
      };
      return handles;
    },
    {} as Record<
      string,
      {
        sourceHandles: string[];
        targetHandles: string[];
      }
    >,
  );

  const normalizedEdges = edges.map((edge) => {
    const sourceIndex = sourceEdgesByNode[edge.source] ?? 0;
    const targetIndex = targetEdgesByNode[edge.target] ?? 0;
    const sourceHandle = getFixedHandleIdForEdge(
      edge.source,
      'source',
      sourceIndex,
    );
    const targetHandle = getFixedHandleIdForEdge(
      edge.target,
      'target',
      targetIndex,
    );

    sourceEdgesByNode[edge.source] = sourceIndex + 1;
    targetEdgesByNode[edge.target] = targetIndex + 1;

    return {
      ...edge,
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

  return {
    nodes: nodes.map((node) => ({
      ...node,
      data: {
        ...node,
        sourceHandles: nodeHandles[node.id]?.sourceHandles ?? [],
        targetHandles: nodeHandles[node.id]?.targetHandles ?? [],
      },
      position: { x: 0, y: 0 },
    })),
    edges: normalizedEdges.map((edge) => ({
      ...edge,
      data: {
        sourcePort: {
          edges: edgesCount[`source-${edge.source}`],
          portIndex: getHandleIndex('source', edge.sourceHandle),
          portCount: nodeHandles[edge.source].sourceHandles.length,
          edgeIndex: edgesIndex[edge.id].source,
          edgeCount: edgesCount[edge.sourceHandle],
        },
        targetPort: {
          edges: edgesCount[`target-${edge.target}`],
          portIndex: getHandleIndex('target', edge.targetHandle),
          portCount: nodeHandles[edge.target].targetHandles.length,
          edgeIndex: edgesIndex[edge.id].target,
          edgeCount: edgesCount[edge.targetHandle],
        },
      },
    })),
  };
};
