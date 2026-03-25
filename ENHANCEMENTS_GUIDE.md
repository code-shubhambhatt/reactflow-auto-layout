# Enhancements Guide

This document explains the custom enhancements added on top of the base `reactflow-auto-layout` project and how to use the current implementation inside another application.

## Purpose

The base project already provides:

- auto-layout
- orthogonal edge routing
- interactive edge segment dragging

This fork extends it to better support architecture-style diagrams that come from converted JSON sources and need stronger control over labels, ports, and grouping.

## Main Enhancements

### 1. Compatible Workflow Input

The project now accepts a simplified architecture workflow format:

- `nodes`
- `edges`
- optional top-level `groups`

The conversion layer lives in [src/data/convert.ts](./src/data/convert.ts).

What it does:

- creates internal React Flow node data
- normalizes handle ids
- decorates edges with routing metadata
- preserves top-level `groups`

### 2. Unified Four-Side Ports

The original source data used split handle concepts like separate incoming and outgoing handles. This fork now uses one shared logical port per side:

- `nodeId#port#top`
- `nodeId#port#right`
- `nodeId#port#bottom`
- `nodeId#port#left`

Implementation:

- [src/layout/ports.ts](./src/layout/ports.ts)
- [src/data/types.ts](./src/data/types.ts)
- [src/components/Nodes/BaseNode/index.tsx](./src/components/Nodes/BaseNode/index.tsx)

Behavior:

- one visible port per side
- all four sides are rendered
- the same visible port can act as connection start or end
- edge direction is still stored on the edge itself using `source` and `target`

### 3. Loose Connection Mode

To support a single visible port per side, React Flow is configured in loose connection mode.

Implementation:

- [src/App.tsx](./src/App.tsx)

What was added:

- `connectionMode={ConnectionMode.Loose}`
- custom `isValidConnection`
- custom `onConnect`
- custom `onReconnect`

Important detail:

- when a new edge is created or reconnected, the code runs it through `decorateReactflowEdges(...)` so the app keeps its internal edge metadata consistent

### 4. JSON Label Support

Nodes now display the `label` coming from JSON instead of falling back to raw ids.

Relevant files:

- [src/data/types.ts](./src/data/types.ts)
- [src/components/Nodes/BaseNode/index.tsx](./src/components/Nodes/BaseNode/index.tsx)
- [src/layout/metadata.ts](./src/layout/metadata.ts)

### 5. Square Node Styling

Nodes were customized to look more like architecture blocks instead of default rounded cards.

Relevant files:

- [src/components/Nodes/BaseNode/styles.css](./src/components/Nodes/BaseNode/styles.css)
- [src/layout/metadata.ts](./src/layout/metadata.ts)

### 6. Solid Orthogonal Edges

Edge routing was constrained to architecture-style visual rules:

- no curved edge rendering
- 90-degree paths
- rounded corners
- solid stroke by default

Relevant files:

- [src/layout/edge/style.ts](./src/layout/edge/style.ts)
- [src/layout/edge/index.ts](./src/layout/edge/index.ts)
- [src/layout/edge/edge.ts](./src/layout/edge/edge.ts)

### 7. Reverse Edge Action

Selected edges now show a reverse-direction action.

Implementation:

- [src/components/Edges/BaseEdge/index.tsx](./src/components/Edges/BaseEdge/index.tsx)

Behavior:

- select an edge
- click the reverse button near the label
- the app swaps `source`, `target`, `sourceHandle`, and `targetHandle`
- the edge is then redecorated and rerouted

### 8. Group Rendering

Top-level `groups` from workflow JSON are preserved and rendered as background group containers.

Implementation:

- [src/layout/groups.ts](./src/layout/groups.ts)
- [src/components/Nodes/GroupNode/index.tsx](./src/components/Nodes/GroupNode/index.tsx)
- [src/components/Nodes/GroupNode/styles.css](./src/components/Nodes/GroupNode/styles.css)
- [src/components/Nodes/index.tsx](./src/components/Nodes/index.tsx)

Current model:

- groups are generated from member-node bounds
- groups are displayed as background visual containers
- group labels come from top-level `groups`

## Current Compatible JSON Shape

Use this format when loading data into the app:

```json
{
  "nodes": [
    {
      "id": "node-a",
      "type": "base",
      "label": "Service A",
      "category": "Compute",
      "serviceprovidername": "aws",
      "serviceid": "48",
      "groups": ["group-core"]
    }
  ],
  "edges": [
    {
      "id": "edge-a-b",
      "source": "node-a",
      "target": "node-b",
      "sourceHandle": "node-a#port#right",
      "targetHandle": "node-b#port#left",
      "label": "Calls"
    }
  ],
  "groups": [
    {
      "id": "group-core",
      "label": "Core Services",
      "typeId": 254
    }
  ]
}
```

## How The App Works

### Startup Flow

1. The app loads [src/data/data.json](./src/data/data.json).
2. `workflow2reactflow(...)` converts it to internal React Flow data.
3. `useAutoLayout(...)` runs layout passes.
4. Nodes, edges, and generated group nodes are rendered.

Relevant files:

- [src/App.tsx](./src/App.tsx)
- [src/data/convert.ts](./src/data/convert.ts)
- [src/layout/useAutoLayout.ts](./src/layout/useAutoLayout.ts)
- [src/layout/node/index.ts](./src/layout/node/index.ts)

### Runtime Edge Behavior

Whenever edges are added, reconnected, or reversed:

1. edge endpoints are updated
2. `decorateReactflowEdges(...)` recalculates edge metadata
3. cached edge layout is cleared
4. routing and label positions are recomputed

## How To Use This In An Existing Application

### Option 1. Use This Repo As The Viewer/Editor

1. Prepare your architecture JSON in the compatible format.
2. Replace [src/data/data.json](./src/data/data.json), or paste your JSON into the control panel.
3. Run:

```bash
pnpm install
pnpm dev
```

### Option 2. Reuse The Logic In Another React Flow App

If you want to bring these enhancements into an existing application, the minimum pieces to reuse are:

- [src/data/convert.ts](./src/data/convert.ts)
- [src/layout/ports.ts](./src/layout/ports.ts)
- [src/layout/useAutoLayout.ts](./src/layout/useAutoLayout.ts)
- [src/components/Nodes/BaseNode/index.tsx](./src/components/Nodes/BaseNode/index.tsx)
- [src/components/Edges/BaseEdge/index.tsx](./src/components/Edges/BaseEdge/index.tsx)

You also need:

- `connectionMode={ConnectionMode.Loose}`
- custom `nodeTypes`
- custom `edgeTypes`
- a call to `decorateReactflowEdges(...)` after connect, reconnect, or programmatic edge mutation

### Required Integration Rules

If you integrate this into another application, keep these rules:

1. Keep shared side-port ids in the format `nodeId#port#side`.
2. Always run external workflow input through `workflow2reactflow(...)`.
3. After changing edges at runtime, rebuild them with `decorateReactflowEdges(...)`.
4. Keep the React Flow instance accessible because edge routing depends on measured node positions.
5. If you keep group rendering, preserve top-level `groups` with `id` and `label`.

## Important Files

- [src/App.tsx](./src/App.tsx): app setup, loose connection mode, connect/reconnect wiring
- [src/data/convert.ts](./src/data/convert.ts): workflow conversion and edge decoration
- [src/data/types.ts](./src/data/types.ts): workflow and internal node/edge types
- [src/layout/ports.ts](./src/layout/ports.ts): shared port scheme and handle normalization
- [src/layout/useAutoLayout.ts](./src/layout/useAutoLayout.ts): two-pass layout flow
- [src/layout/node/algorithms/elk.ts](./src/layout/node/algorithms/elk.ts): ELK port layout integration
- [src/layout/groups.ts](./src/layout/groups.ts): dynamic group container generation
- [src/components/Nodes/BaseNode/index.tsx](./src/components/Nodes/BaseNode/index.tsx): single visible port per side
- [src/components/Edges/BaseEdge/index.tsx](./src/components/Edges/BaseEdge/index.tsx): edge rendering, reverse action

## Current Limitations

These are important if you plan to reuse the implementation:

- groups are currently visual wrappers based on node bounds, not true structural layout containers
- reversing one edge rebuilds edge metadata globally through `decorateReactflowEdges(...)`
- root-level compatible example JSON files in the parent workspace are outside the Git repo unless copied in

## Suggested Usage For Team Understanding

If this document is being used by another team or application owner, the recommended reading order is:

1. [src/data/types.ts](./src/data/types.ts)
2. [src/layout/ports.ts](./src/layout/ports.ts)
3. [src/data/convert.ts](./src/data/convert.ts)
4. [src/App.tsx](./src/App.tsx)
5. [src/layout/useAutoLayout.ts](./src/layout/useAutoLayout.ts)
6. [src/components/Nodes/BaseNode/index.tsx](./src/components/Nodes/BaseNode/index.tsx)
7. [src/components/Edges/BaseEdge/index.tsx](./src/components/Edges/BaseEdge/index.tsx)

That sequence matches the actual runtime flow of the application.
