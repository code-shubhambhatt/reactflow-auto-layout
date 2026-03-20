import { Position } from '@xyflow/react';

export type HandleKind = 'source' | 'target';
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

export const kSourceHandleSides: readonly HandleSide[] = ['right', 'bottom'];
export const kTargetHandleSides: readonly HandleSide[] = ['left', 'top'];

const kHandleSideByPosition: Record<Position, HandleSide> = {
  [Position.Top]: 'top',
  [Position.Right]: 'right',
  [Position.Bottom]: 'bottom',
  [Position.Left]: 'left',
};

const kSideOrders: Record<HandleKind, readonly Position[]> = {
  source: [Position.Right, Position.Bottom],
  target: [Position.Left, Position.Top],
};

export const kHandlePositionBySide: Record<HandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

const isHandleSide = (value: string): value is HandleSide => {
  return ['top', 'right', 'bottom', 'left'].includes(value);
};

export const getHandleSideFromId = (id: string): HandleSide | undefined => {
  const parts = id.split('#');
  const candidates = [parts[parts.length - 2], parts[parts.length - 1]];
  return candidates.find((candidate): candidate is HandleSide => {
    return !!candidate && isHandleSide(candidate);
  });
};

export const getFixedHandleId = (
  nodeId: string,
  kind: HandleKind,
  side: HandleSide,
) => {
  return `${nodeId}#${kind}#${side}`;
};

export const getFixedHandleIds = (nodeId: string, kind: HandleKind) => {
  const sides = kind === 'source' ? kSourceHandleSides : kTargetHandleSides;
  return sides.map((side) => getFixedHandleId(nodeId, kind, side));
};

export const getFixedHandleIdForEdge = (
  nodeId: string,
  kind: HandleKind,
  edgeIndex: number,
) => {
  const sides = kind === 'source' ? kSourceHandleSides : kTargetHandleSides;
  const side = sides[edgeIndex % sides.length];
  return getFixedHandleId(nodeId, kind, side);
};

export const getHandleIndex = (kind: HandleKind, id: string) => {
  const side = getHandleSideFromId(id);
  if (side) {
    const sides = kind === 'source' ? kSourceHandleSides : kTargetHandleSides;
    const idx = sides.indexOf(side);
    if (idx >= 0) {
      return idx;
    }
  }

  const idx = Number.parseInt(id.split('#').at(-1) ?? '', 10);
  return Number.isFinite(idx) ? idx : 0;
};

export const getHandlePosition = (
  kind: HandleKind,
  index: number,
  id?: string,
): Position => {
  const side = id ? getHandleSideFromId(id) : undefined;
  if (side) {
    return kHandlePositionBySide[side];
  }
  const positions = kSideOrders[kind];
  return positions[index % positions.length];
};

export const getHandleSide = (
  kind: HandleKind,
  index: number,
  id?: string,
): HandleSide => {
  const side = id ? getHandleSideFromId(id) : undefined;
  if (side) {
    return side;
  }
  return kHandleSideByPosition[getHandlePosition(kind, index)];
};

export const groupHandlesBySide = (ids: string[], kind: HandleKind) => {
  return ids.reduce(
    (groups, id, index) => {
      groups[getHandleSide(kind, index, id)].push(id);
      return groups;
    },
    {
      top: [] as string[],
      right: [] as string[],
      bottom: [] as string[],
      left: [] as string[],
    },
  );
};
