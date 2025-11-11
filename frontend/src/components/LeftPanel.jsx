import React, { useMemo, useState } from 'react';
import Button from './ui/button';
import { k } from '../lib';

export default function LeftPanel({
  isOpen,
  onToggle,
  nodes = [],
  edges = [],
  selectedNode,
  onClickNodeEdit,
  onClickNodeDelete,
  onClickEdgeDelete,
}) {
  const [showNodes, setShowNodes] = useState(true);
  const [showEdges, setShowEdges] = useState(true);

  const nodeItems = useMemo(() => nodes, [nodes]);
  const edgeItems = useMemo(() => edges, [edges]);

  return (
    <>

      <aside
        className={[
          'fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white border-r shadow-lg z-40',
          'transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'flex flex-col',
        ].join(' ')}
        aria-hidden={!isOpen}
      >
        <div className="h-12 flex items-center justify-between px-3 border-b bg-white">
          <div className="font-semibold text-sm text-[#ea6300]">Map Items</div>
          <button
            onClick={onToggle}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close left panel"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <SectionHeader
            title={`Nodes (${nodeItems.length})`}
            open={showNodes}
            onToggle={() => setShowNodes(v => !v)}
          />
          {showNodes && (
            <ul className="space-y-1 px-3 pb-3">
              {nodeItems.map(n => (
                <li
                  key={k(n)}
                  className={`card ${selectedNode?.code === n.code ? 'bg-blue-50 border-blue-300' : ''}`}
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {n.name || 'Node'} • <span className="text-gray-500">#{n.code}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ({Number(n.x).toLocaleString()} mm, {Number(n.y).toLocaleString()} mm)
                      </div>
                      {(n.charger || n.chute) && (
                        <div className="text-xs text-gray-600">
                          {n.charger && <>Charger: <b>{n.charger.direction}</b>{n.chute ? ' · ' : ''}</>}
                          {n.chute && <>Chute: <b>{n.chute.direction}</b></>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => onClickNodeEdit?.(n.code)}>Edit</Button>
                      <Button variant="danger" onClick={() => onClickNodeDelete?.(n.code)}>Del</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <SectionHeader
            title={`Edges (${edgeItems.length})`}
            open={showEdges}
            onToggle={() => setShowEdges(v => !v)}
          />
          {showEdges && (
            <ul className="space-y-1 px-3 pb-6">
              {edgeItems.map((e, i) => (
                <li key={`${e.from}-${e.to}-${i}`} className="card flex justify-between items-center">
                  <span className="truncate">
                    #{e.from} ⇄ #{e.to}
                    {e.length != null && <span className="text-gray-500"> ({e.length})</span>}
                  </span>
                  <Button onClick={() => onClickEdgeDelete?.(e)}>Del</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-16 z-30 h-10 w-5 rounded-r-full bg-[#ea6300] hover:bg-[#ff7a1a] shadow text-white"
          title="Open panel"
          aria-label="Open left panel"
        >
          ▸
        </button>
      )}
    </>
  );
}

function SectionHeader({ title, open, onToggle }) {
  return (
    <div className="sticky top-0 bg-white z-10 border-y px-3 py-2 flex items-center gap-2">
      <button
        onClick={onToggle}
        className="text-gray-600 hover:text-gray-900"
        aria-expanded={open}
        aria-label={open ? 'Collapse section' : 'Expand section'}
        title={open ? 'Collapse' : 'Expand'}
      >
        {open ? '▾' : '▸'}
      </button>
      <div className="flex-1 font-semibold text-sm text-[#ea6300]">{title}</div>
    </div>
  );
}




