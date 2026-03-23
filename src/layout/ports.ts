import { Position } from '@xyflow/react';

export type HandleKind = 'source' | 'target';
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

export const kPortSides: readonly HandleSide[] = [
  'top',
  'right',
  'bottom',
  'left',
];

const kPortSideOrders: Record<HandleKind, readonly HandleSide[]> = {
  source: ['right', 'bottom', 'left', 'top'],
  target: ['left', 'top', 'right', 'bottom'],
};

const kHandleSideByPosition: Record<Position, HandleSide> = {
  [Position.Top]: 'top',
  [Position.Right]: 'right',
  [Position.Bottom]: 'bottom',
  [Position.Left]: 'left',
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

export const getPortId = (nodeId: string, side: HandleSide) => {
  return `${nodeId}#port#${side}`;
};

export const getPortIds = (nodeId: string) => {
  return kPortSides.map((side) => getPortId(nodeId, side));
};

const getFallbackSide = (kind: HandleKind, index: number) => {
  return kPortSideOrders[kind][index % kPortSideOrders[kind].length];
};

export const normalizePortId = (
  nodeId: string,
  kind: HandleKind,
  id: string | null | undefined,
  edgeIndex = 0,
) => {
  const side =
    (id ? getHandleSideFromId(id) : undefined) ??
    getFallbackSide(kind, edgeIndex);
  return getPortId(nodeId, side);
};

export const getFixedHandleId = (
  nodeId: string,
  kind: HandleKind,
  side: HandleSide,
) => {
  return getPortId(nodeId, side);
};

export const getFixedHandleIds = (nodeId: string, _kind: HandleKind) => {
  return getPortIds(nodeId);
};

export const getFixedHandleIdForEdge = (
  nodeId: string,
  kind: HandleKind,
  edgeIndex: number,
) => {
  return normalizePortId(nodeId, kind, undefined, edgeIndex);
};

export const getHandleIndex = (kind: HandleKind, id: string) => {
  const side = getHandleSideFromId(id);
  if (side) {
    const sides = kPortSideOrders[kind];
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
  return kHandlePositionBySide[getFallbackSide(kind, index)];
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

export const groupHandlesBySide = (
  ids: string[],
  kind: HandleKind = 'source',
) => {
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
