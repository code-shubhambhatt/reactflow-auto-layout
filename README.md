# ReactFlow Auto Layout

This project is a React Flow based diagram editor with:

- automatic node layout
- orthogonal edge routing with rounded corners
- edge dragging/editing
- fixed side ports
- background group containers derived from workflow metadata

For a focused explanation of the custom enhancements in this fork and how to integrate them into another application, see [ENHANCEMENTS_GUIDE.md](./ENHANCEMENTS_GUIDE.md).

## Run Locally

### Prerequisites

- Node.js 20+ recommended
- `pnpm` recommended because the repo declares `pnpm@10.26.2`

### Install

```bash
git clone https://github.com/code-shubhambhatt/reactflow-auto-layout.git
cd reactflow-auto-layout
pnpm install
```

### Start the app

```bash
pnpm dev
```

Open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

### Other useful commands

```bash
pnpm build
pnpm preview
pnpm lint
```

## How To Use

On startup, the app loads the sample workflow from [src/data/data.json](./src/data/data.json).

If you want to test your own workflow, use either of these approaches:

1. Replace the contents of [src/data/data.json](./src/data/data.json) and restart or refresh.
2. Paste your workflow JSON into the `Workflow` field in the left control panel and click `Layout`.

You can also change:

- `Algorithms`
- `Direction`
- `Spacing`
- source handle order

The default layout settings live in [src/layout/node/index.ts](./src/layout/node/index.ts).

## Workflow JSON Format

This fork expects a compatible workflow JSON like this:

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
      "sourceHandle": "node-a#source#0",
      "targetHandle": "node-b#target#0",
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

### Notes

- Node `label` is displayed in the UI.
- `groups` on a node define which background containers the node belongs to.
- Top-level `groups` are used to render the visible group labels.
- Directional handle metadata from older source files is not required here. The app remaps edges onto its fixed side-port model during conversion.

## Current Port Model

The stable port configuration in this repo is:

- target ports on `left` and `top`
- source ports on `right` and `bottom`

The side assignment logic is in [src/layout/ports.ts](./src/layout/ports.ts).

## Group Rendering

Group functionality is implemented as generated background nodes:

1. workflow `groups` are preserved during conversion
2. normal service nodes are laid out first
3. group bounds are computed from member-node positions
4. synthetic `group` nodes are rendered behind service nodes

Relevant files:

- [src/data/types.ts](./src/data/types.ts)
- [src/data/convert.ts](./src/data/convert.ts)
- [src/layout/groups.ts](./src/layout/groups.ts)
- [src/components/Nodes/GroupNode/index.tsx](./src/components/Nodes/GroupNode/index.tsx)

## Project Structure

- [src/App.tsx](./src/App.tsx): app entry and initial workflow load
- [src/components/ControlPanel.tsx](./src/components/ControlPanel.tsx): layout controls and workflow JSON input
- [src/data/convert.ts](./src/data/convert.ts): converts workflow JSON into the internal React Flow shape
- [src/layout/node](./src/layout/node): node layout algorithms and defaults
- [src/layout/edge](./src/layout/edge): edge routing and path generation
- [src/layout/groups.ts](./src/layout/groups.ts): group container generation

## Example Files

Compatible examples created during testing live outside the package root in the parent workspace, for example:

- `react-diagram.json`
- `production_ready_aws_architecture_compatible.json`
- `gcp_static_website_production_compatible.json`

If you want those versioned in the repo, copy them under this project before committing.
