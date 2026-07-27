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
        className="fixed left-3 top-16 z-40 overflow-hidden rounded-[26px] border border-gray-300 bg-white/96 backdrop-blur-sm transition-[width,height] duration-300 ease-out"
        style={{
          width: isOpen ? '20rem' : '10.5rem',
          height: isOpen ? 'calc(100% - 4.75rem)' : '3.25rem',
          maxWidth: '85vw',
          willChange: 'width, height',
        }}
        aria-hidden={!isOpen}
      >
        <div className={`flex items-center justify-between ${isOpen ? 'px-4 py-2' : 'px-0 py-0'}`}>
          <button
            onClick={onToggle}
            className={`flex items-center gap-2 border border-[#d55a00] bg-[#ea6300] text-sm font-medium text-white transition-colors hover:bg-[#ff7a1a] ${
              isOpen
                ? 'h-9 rounded-full px-3'
                : 'h-[3.25rem] w-full justify-center rounded-full px-4'
            }`}
            aria-label={isOpen ? 'Hide left panel' : 'Open left panel'}
            title={isOpen ? 'Hide panel' : 'Open panel'}
          >
            <span className="leading-none">{isOpen ? '−' : '+'}</span>
            <span>Map Items</span>
          </button>
        </div>
        <div
          className="h-[calc(100%-3.25rem)] min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-4 transition-opacity duration-200"
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
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




