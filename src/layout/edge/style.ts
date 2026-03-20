import { deepClone, deepEqual } from '@del-wang/utils';
import { getBezierPath, type Position } from '@xyflow/react';

import { flowStore } from '@/states/reactflow';

import { kBaseMarkerColor } from '../../components/Edges/Marker';
import type { EdgeLayout } from '../../data/types';
import { getBasePath } from '.';
import { getLabelPosition, getPathWithRoundCorners } from './edge';

interface EdgeStyle {
  color: string;
  edgeType: 'solid' | 'dashed';
  pathType: 'base' | 'bezier';
}

/**
 * Get the style of the connection line
 *
 * 1. When there are more than 3 edges connecting to both ends of the Node, use multiple colors to distinguish the edges.
 * 2. When the connection line goes backward or connects to a hub Node, use dashed lines to distinguish the edges.
 * 3. When the connection line goes from a hub to a Node, use bezier path.
 */
export const getEdgeStyles = (props: {
  id: string;
  isBackward: boolean;
}): EdgeStyle => {
  const { id: _id, isBackward: _isBackward } = props;
  return { color: kBaseMarkerColor, edgeType: 'solid', pathType: 'base' };
};

interface ILayoutEdge {
  id: string;
  layout?: EdgeLayout;
  offset: number;
  borderRadius: number;
  pathType: EdgeStyle['pathType'];
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
}

export function layoutEdge({
  id,
  layout,
  offset,
  borderRadius,
  pathType,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: ILayoutEdge): EdgeLayout {
  const sourceNode = flowStore.value.getInternalNode(source);
  const targetNode = flowStore.value.getInternalNode(target);
  const sourceRect = sourceNode
    ? {
        x: sourceNode.internals.positionAbsolute?.x ?? sourceNode.position.x,
        y: sourceNode.internals.positionAbsolute?.y ?? sourceNode.position.y,
        width: sourceNode.width ?? 0,
        height: sourceNode.height ?? 0,
      }
    : undefined;
  const targetRect = targetNode
    ? {
        x: targetNode.internals.positionAbsolute?.x ?? targetNode.position.x,
        y: targetNode.internals.positionAbsolute?.y ?? targetNode.position.y,
        width: targetNode.width ?? 0,
        height: targetNode.height ?? 0,
      }
    : undefined;
  const relayoutDeps = [
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceRect?.x,
    sourceRect?.y,
    sourceRect?.width,
    sourceRect?.height,
    targetRect?.x,
    targetRect?.y,
    targetRect?.width,
    targetRect?.height,
    pathType,
    borderRadius,
    offset,
  ];
  const needRelayout = !deepEqual(relayoutDeps, layout?.deps?.relayoutDeps);
  const reBuildPathDeps = layout?.points;
  const needReBuildPath = !deepEqual(
    reBuildPathDeps,
    layout?.deps?.reBuildPathDeps,
  );
  let newLayout = layout;
  if (needRelayout) {
    newLayout = _layoutEdge({
      id,
      offset,
      borderRadius,
      pathType,
      source,
      target,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  } else if (needReBuildPath) {
    newLayout = _layoutEdge({
      layout,
      id,
      offset,
      borderRadius,
      pathType,
      source,
      target,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }
  newLayout!.deps = deepClone({ relayoutDeps, reBuildPathDeps });
  return newLayout!;
}

function _layoutEdge({
  id,
  layout,
  offset,
  borderRadius,
  pathType,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: ILayoutEdge): EdgeLayout {
  const _pathType: EdgeStyle['pathType'] = pathType;
  if (_pathType === 'bezier') {
    const [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    const points = [
      {
        id: 'source-' + id,
        x: sourceX,
        y: sourceY,
      },
      {
        id: 'target-' + id,
        x: targetX,
        y: targetY,
      },
    ];
    return {
      path,
      points,
      inputPoints: points,
      labelPosition: {
        x: labelX,
        y: labelY,
      },
    };
  }

  if ((layout?.points?.length ?? 0) > 1) {
    layout!.path = getPathWithRoundCorners(layout!.points, borderRadius);
    layout!.labelPosition = getLabelPosition(layout!.points);
    return layout!;
  }

  return getBasePath({
    id,
    offset,
    borderRadius,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
}
