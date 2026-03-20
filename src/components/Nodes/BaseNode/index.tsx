import './styles.css';

import {
  Handle,
  type NodeProps,
  Position,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { type ComponentType, type CSSProperties, memo, useEffect } from 'react';

import { kReactflowLayoutConfig } from '@/components/ControlPanel';
import type { ReactflowBaseNode } from '@/data/types';
import {
  groupHandlesBySide,
  type HandleKind,
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
  kind: HandleKind,
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
        className={`handles-side handles-side-${side} ${kind}s`}
        key={`${kind}-${side}`}
        style={{ flexDirection: getHandleFlexDirection(side, reverseOrder) }}
      >
        {ids.map((id) => (
          <Handle
            className={`handle handle-${side}`}
            id={id}
            key={id}
            position={kHandlePositionBySide[side]}
            type={kind}
          />
        ))}
      </div>
    );
  });
};

export const BaseNode: ComponentType<NodeProps<ReactflowBaseNode>> = memo(
  ({ id, data }) => {
    const { reverseSourceHandles } = kReactflowLayoutConfig.state;
    const updateNodeInternals = useUpdateNodeInternals();
    const targetHandlesBySide = groupHandlesBySide(
      data.targetHandles,
      'target',
    );
    const sourceHandlesBySide = groupHandlesBySide(
      data.sourceHandles,
      'source',
    );

    useEffect(() => {
      const frameId = requestAnimationFrame(() => {
        updateNodeInternals(id);
      });
      return () => {
        cancelAnimationFrame(frameId);
      };
    }, [id, data.sourceHandles, data.targetHandles, updateNodeInternals]);

    return (
      <>
        {renderHandles('target', targetHandlesBySide)}
        <div className="label">{String(data.label ?? data.id)}</div>
        {renderHandles('source', sourceHandlesBySide, reverseSourceHandles)}
      </>
    );
  },
);

BaseNode.displayName = 'BaseNode';
