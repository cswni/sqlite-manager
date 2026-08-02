"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { useApp } from "@/lib/store";
import { Toolbar } from "@/components/ui";

const NODE_W = 200;
const NODE_H = 120;

function layout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 60 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    return {
      ...n,
      position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
    };
  });
}

function TableNode({ data }: { data: { label: string; cols: string[]; selected: boolean } }) {
  return (
    <div
      className={`min-w-[180px] border bg-bg text-[11px] shadow-sm ${
        data.selected ? "border-primary" : "border-border"
      }`}
    >
      <div className="border-b border-border bg-surface-2 px-2 py-1 font-semibold text-ink">
        {data.label}
      </div>
      <ul className="max-h-28 overflow-auto font-mono text-muted">
        {data.cols.slice(0, 8).map((c) => (
          <li key={c} className="border-b border-border/60 px-2 py-0.5 last:border-0">
            {c}
          </li>
        ))}
        {data.cols.length > 8 && (
          <li className="px-2 py-0.5 text-[10px]">+{data.cols.length - 8} more</li>
        )}
      </ul>
    </div>
  );
}

const nodeTypes = { table: TableNode };

export function DiagramView() {
  const { tables, selectedTable, setSelectedTable, loadTableRows } = useApp();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const built = useMemo(() => {
    const ns: Node[] = tables.map((t) => ({
      id: t.name,
      type: "table",
      position: { x: 0, y: 0 },
      data: {
        label: t.name,
        cols: (t.columns ?? []).map((c) => `${c.name} ${c.type}${c.primaryKey ? " PK" : ""}`),
        selected: t.name === selectedTable,
      },
    }));
    const es: Edge[] = [];
    for (const t of tables) {
      for (const fk of t.foreignKeys ?? []) {
        es.push({
          id: `${t.name}-${fk.from}-${fk.table}-${fk.to}`,
          source: t.name,
          target: fk.table,
          label: `${fk.from}→${fk.to}`,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          style: { stroke: "oklch(0.55 0.08 155)" },
        });
      }
    }
    return { nodes: layout(ns, es), edges: es };
  }, [tables, selectedTable]);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="text-[12px] text-muted">
          ER diagram · {tables.length} table(s) · click a node to open data
        </span>
      </Toolbar>
      <div className="min-h-0 flex-1">
        {tables.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted">
            No tables to diagram. Create tables or open a populated database.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            onNodeClick={(_, n) => {
              setSelectedTable(n.id);
              void loadTableRows(n.id);
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} color="oklch(0.9 0.01 145)" />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
