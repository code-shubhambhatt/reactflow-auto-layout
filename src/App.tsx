import '@xyflow/react/dist/style.css';

import { jsonDecode } from '@del-wang/utils';
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect, useId } from 'react';

import { ControlPanel } from './components/ControlPanel';
import { kEdgeTypes } from './components/Edges';
import { ColorfulMarkerDefinitions } from './components/Edges/Marker';
import { kNodeTypes } from './components/Nodes';
import { ReactflowInstance } from './components/ReactflowInstance';
import { decorateReactflowEdges, workflow2reactflow } from './data/convert';
import defaultWorkflow from './data/data.json';
import {
  kDefaultLayoutConfig,
  type ReactflowLayoutConfig,
} from './layout/node';
import { useAutoLayout } from './layout/useAutoLayout';

const isValidPortConnection = (connection: {
  source?: string | null;
  target?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}) => {
  const { source, target, sourceHandle, targetHandle } = connection;
  return (
    !!source &&
    !!target &&
    !!sourceHandle &&
    !!targetHandle &&
    !(source === target && sourceHandle === targetHandle)
  );
};

const EditWorkFlow = () => {
  const [nodes, _setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { layout, isDirty } = useAutoLayout();

  const rebuildEdges = (nextEdges: any[]) => {
    return decorateReactflowEdges(nodes as any, nextEdges as any);
  };

  const layoutReactflow = async (
    props: ReactflowLayoutConfig & {
      workflow: string;
    },
  ) => {
    if (isDirty) {
      return;
    }
    const input = props.workflow;
    const data = jsonDecode(input);
    if (!data) {
      alert('Invalid workflow JSON data');
      return;
    }
    const workflow = workflow2reactflow(data);
    layout({ ...workflow, ...props });
  };

  const onConnect = (connection: any) => {
    if (!isValidPortConnection(connection)) {
      return;
    }

    setEdges((currentEdges) => {
      const nextEdges = addEdge(
        {
          ...connection,
          type: 'base',
        },
        currentEdges,
      );
      return rebuildEdges(nextEdges);
    });
  };

  const onReconnect = (oldEdge: any, newConnection: any) => {
    if (!isValidPortConnection(newConnection)) {
      return;
    }

    setEdges((currentEdges) => {
      const nextEdges = reconnectEdge(oldEdge, newConnection, currentEdges, {
        shouldReplaceId: false,
      });
      return rebuildEdges(nextEdges);
    });
  };

  useEffect(() => {
    const workflow = workflow2reactflow(defaultWorkflow as any);
    layout({ ...workflow, ...kDefaultLayoutConfig });
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <ColorfulMarkerDefinitions />
      <ReactFlow
        connectionMode={ConnectionMode.Loose}
        edges={edges}
        edgeTypes={kEdgeTypes}
        isValidConnection={isValidPortConnection}
        nodes={nodes}
        nodeTypes={kNodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
        onReconnect={onReconnect}
      >
        <Background
          color="#ccc"
          id={useId()}
          variant={BackgroundVariant.Dots}
        />
        <ReactflowInstance />
        <Controls />
        <MiniMap pannable zoomable />
        <ControlPanel layoutReactflow={layoutReactflow} />
      </ReactFlow>
    </div>
  );
};

export const WorkFlow = () => {
  return (
    <ReactFlowProvider>
      <EditWorkFlow />
    </ReactFlowProvider>
  );
};
