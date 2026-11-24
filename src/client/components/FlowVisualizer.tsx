import React, { useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeftRight, CheckCircle2, RotateCcw } from "lucide-react";
import type { Match } from "../types.js";
import { formatCurrency } from "./PropertyCard.js";

interface FlowVisualizerProps {
  match: Match;
}

export const FlowVisualizer: React.FC<FlowVisualizerProps> = ({ match }) => {
  const [viewMode, setViewMode] = useState<"preference" | "transfer">("preference");

  const { nodes, edges } = useMemo(() => {
    const partyCount = match.partyCount;
    const isDirect = partyCount === 2;

    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    // Layout coordinates
    let positions: Array<{ x: number; y: number }> = [];
    if (isDirect) {
      positions = [
        { x: 100, y: 120 },
        { x: 500, y: 120 }
      ];
    } else {
      // Equilateral triangle for 3-party
      positions = [
        { x: 300, y: 40 },   // A (Top)
        { x: 520, y: 300 },  // B (Bottom Right)
        { x: 80, y: 300 }    // C (Bottom Left)
      ];
    }

    // Build nodes for each participant
    for (let i = 0; i < partyCount; i++) {
      const listingId = match.listingIds[i];
      const boot = match.boots.find((b) => b.listingId === listingId) || match.boots[i];
      const pos = positions[i] || { x: 100 + i * 200, y: 150 };

      const bootColor =
        boot?.action === "pays"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : boot?.action === "receives"
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

      const bootText =
        boot?.action === "pays"
          ? `+ Pays ${formatCurrency(boot.cashDifference)}`
          : boot?.action === "receives"
          ? `- Receives ${formatCurrency(boot.cashDifference)}`
          : "₹0 (Exact Value)";

      generatedNodes.push({
        id: listingId,
        position: pos,
        data: {
          label: (
            <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-md min-w-[190px] text-left">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono text-[10px] text-slate-400 font-bold">#{listingId}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bootColor}`}>
                  {bootText}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs truncate">{boot?.ownerName || listingId}</h4>
              <p className="text-[11px] text-slate-600 capitalize">
                Owns: <strong>{boot?.givesPropertyType?.replace(/_/g, " ")}</strong>
              </p>
              <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
                Valued: {formatCurrency(boot?.givesValue || 0)}
              </p>
            </div>
          )
        },
        draggable: true
      });
    }

    // Mode 1: Preference Cycle (A -> B -> C -> A: A wants & receives B)
    if (viewMode === "preference") {
      for (let i = 0; i < partyCount; i++) {
        const fromId = match.listingIds[i];
        const toId = match.listingIds[(i + 1) % partyCount];
        const receivedBoot = match.boots.find((b) => b.listingId === toId) || match.boots[(i + 1) % partyCount];

        generatedEdges.push({
          id: `pref-${fromId}-${toId}`,
          source: fromId,
          target: toId,
          animated: true,
          label: `Wants & Receives ${receivedBoot?.givesPropertyType?.replace(/_/g, " ")}`,
          style: { stroke: "#2563eb", strokeWidth: 2.5 },
          labelStyle: { fill: "#1e3a8a", fontWeight: 700, fontSize: 10 },
          labelBgStyle: { fill: "#eff6ff", fillOpacity: 0.95, stroke: "#bfdbfe" },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#2563eb"
          }
        });
      }
    } else {
      // Mode 2: Actual Asset Transfers (A -> C, B -> A, C -> B)
      for (let i = 0; i < partyCount; i++) {
        const giverId = match.listingIds[i];
        const receiverId = match.listingIds[(i - 1 + partyCount) % partyCount];
        const giverBoot = match.boots.find((b) => b.listingId === giverId) || match.boots[i];

        generatedEdges.push({
          id: `trans-${giverId}-${receiverId}`,
          source: giverId,
          target: receiverId,
          animated: true,
          label: `Transfers ${giverBoot?.givesPropertyType?.replace(/_/g, " ")} (${formatCurrency(giverBoot?.givesValue || 0)})`,
          style: { stroke: "#0d9488", strokeWidth: 2.5 },
          labelStyle: { fill: "#0f766e", fontWeight: 700, fontSize: 10 },
          labelBgStyle: { fill: "#f0fdfa", fillOpacity: 0.95, stroke: "#99f6e4" },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#0d9488"
          }
        });
      }
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [match, viewMode]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Controls Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            Interactive Exchange Graph Visualization
          </h4>
          <p className="text-xs text-slate-500">
            Drag nodes to explore spatial relations. Animated edges indicate exchange vectors.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setViewMode("preference")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === "preference"
                ? "bg-white text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Preference Flow (A → B → C)
          </button>
          <button
            onClick={() => setViewMode("transfer")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === "transfer"
                ? "bg-white text-teal-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Asset Transfers (A → C, B → A)
          </button>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className={`px-4 py-2.5 text-xs font-medium border-b ${
        viewMode === "preference"
          ? "bg-blue-50/60 border-blue-100 text-blue-900"
          : "bg-teal-50/60 border-teal-100 text-teal-900"
      }`}>
        {viewMode === "preference" ? (
          <span>
            <strong>Cycle Logic:</strong> Participant A wants and receives Participant B's property; B wants and receives C's property; C wants and receives A's property.
          </span>
        ) : (
          <span>
            <strong>Physical Deed Transfers:</strong> Participant A conveys their property to Participant C; Participant B conveys to A; Participant C conveys to B.
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="h-[400px] w-full bg-slate-50/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
        >
          <Background color="#cbd5e1" gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};
