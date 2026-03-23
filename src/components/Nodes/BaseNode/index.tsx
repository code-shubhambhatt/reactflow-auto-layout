import './styles.css';

import {
  Handle,
  type NodeProps,
  Position,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { type ComponentType, type CSSProperties, memo, useEffect } from 'react';

import type { ReactflowBaseNode } from '@/data/types';
import {
  groupHandlesBySide,
  type HandleSide,
  kHandlePositionBySide,
} from '@/layout/ports';

const kSides: HandleSide[] = ['top', 'right', 'bottom', 'left'];

const getHandleFlexDirection = (
  side: HandleSide,
  reverseOrder = false,
): CSSProperties['flexDirection'] => {
  const isHorizontalSide = [Position.Top, Position.Bottom].includes(
    kHandlePositionBySide[side],
  );
  if (isHorizontalSide) {
    return reverseOrder ? 'row-reverse' : 'row';
  }
  return reverseOrder ? 'column-reverse' : 'column';
};

const renderHandles = (
  handlesBySide: Record<HandleSide, string[]>,
  reverseOrder = false,
) => {
  return kSides.map((side) => {
    const ids = handlesBySide[side];
    if (!ids.length) {
      return null;
    }
    return (
      <div
        className={`handles-side handles-side-${side} ports`}
        key={`port-${side}`}
        style={{ flexDirection: getHandleFlexDirection(side, reverseOrder) }}
      >
        {ids.map((id) => (
          <Handle
            className={`handle handle-${side}`}
            id={id}
            isConnectableEnd
            isConnectableStart
            key={id}
            position={kHandlePositionBySide[side]}
            type="source"
          />
        ))}
      </div>
    );
  });
};

export const BaseNode: ComponentType<NodeProps<ReactflowBaseNode>> = memo(
  ({ id, data }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const portsBySide = groupHandlesBySide(data.ports);

    useEffect(() => {
      const frameId = requestAnimationFrame(() => {
        updateNodeInternals(id);
      });
      return () => {
        cancelAnimationFrame(frameId);
      };
    }, [id, data.ports, updateNodeInternals]);

    return (
      <>
        {renderHandles(portsBySide)}
        <div className="label">{String(data.label ?? data.id)}</div>
      </>
    );
  },
);

BaseNode.displayName = 'BaseNode';
