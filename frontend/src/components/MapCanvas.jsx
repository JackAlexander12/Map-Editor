import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MM_PER_GRID, snap, rotatePoint90, k } from '../lib';

const ZOOM_MAX = 5;
const ZOOM_FACTOR_IN = 1.1;
const ZOOM_FACTOR_OUT = 1 / ZOOM_FACTOR_IN;

const BOX_TARGET_PX = 28;
const BOX_MIN_MM = 1000;    // 1 m
const BOX_MAX_MM = 20000;   // 20 m 

const MIN_ARROW_PX = 24;    
const CHARGER_MAX_MM = 10000; // 10 m 
const CHUTE_MAX_MM = 7000;  // 7m 
const EXTEND_PX_IF_BOTH = 12; 
const DRAG_THRESHOLD_PX = 4;
const NODE_HIT_TARGET_PX = 56;

export default function MapCanvas({
  nodes, edges, onDragNode, onAddNodeAt, onCreateEdge,
  tool, zoom, setZoom, origin, setOrigin, rotateView,
  onSelectNode, onDragNodeEnd, maxNeighborDistance,
  bounds, minZoom, leftOffsetPx = 0,
}) {
  const svgRef = useRef(null);
  const [dragNode, setDragNode] = useState(null);
  const [edgeStart, setEdgeStart] = useState(null);
  const [panDrag, setPanDrag] = useState(null);
  const [nodePress, setNodePress] = useState(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragNode) return;

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      onDragNode(dragNode.code, dragNode.nodeStart);
      setDragNode(null);
      setNodePress(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dragNode, onDragNode]);

  const trPoint = (x, y) => (rotateView ? rotatePoint90({ x, y }) : { x, y });
  const view = useMemo(() => ({ scale: zoom, tx: origin.x, ty: origin.y }), [zoom, origin]);

  // ---------- helpers ----------
  const clientToSvgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const screenToWorld = (clientX, clientY) => {
    const p = clientToSvgPoint(clientX, clientY);
    const x = (p.x - view.tx) / view.scale;
    const y = (p.y - view.ty) / view.scale;
    return rotateView ? { x: y, y: -x } : { x, y };
  };

  const clampToBounds = (x, y) => {
    const minX = bounds?.minX ?? 0;
    const minY = bounds?.minY ?? 0;
    const maxX = bounds?.maxX ?? 0;
    const maxY = bounds?.maxY ?? 0;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  };

  const getPanBounds = () => {
    const svg = svgRef.current;
    const w = svg?.clientWidth || 1000;
    const h = svg?.clientHeight || 600;
    const m = 40;

    const minX = bounds?.minX ?? 0;
    const minY = bounds?.minY ?? 0;
    const maxX = bounds?.maxX ?? 10000;
    const maxY = bounds?.maxY ?? 10000;

    const padW = (w / view.scale) * 0.25;
    const padH = (h / view.scale) * 0.25;

    const bx0 = minX - padW;
    const by0 = minY - padH;
    const bx1 = maxX + padW;
    const by1 = maxY + padH;

    const txMin = m - bx0 * view.scale;
    const txMax = (w - m) - bx1 * view.scale;
    const tyMin = m - by0 * view.scale;
    const tyMax = (h - m) - by1 * view.scale;

    const txLo = Math.min(txMin, txMax);
    const txHi = Math.max(txMin, txMax);
    const tyLo = Math.min(tyMin, tyMax);
    const tyHi = Math.max(tyMin, tyMax);
    return { txLo, txHi, tyLo, tyHi };
  };

  const clampOrigin = (tx, ty) => {
    const { txLo, txHi, tyLo, tyHi } = getPanBounds();
    return { x: Math.max(txLo, Math.min(txHi, tx)), y: Math.max(tyLo, Math.min(tyHi, ty)) };
  };

  const onWheel = (e) => {
    e.preventDefault();
    const svgPt = clientToSvgPoint(e.clientX, e.clientY);
    const beforeWorld = { x: (svgPt.x - view.tx) / view.scale, y: (svgPt.y - view.ty) / view.scale };

    const factor = e.deltaY > 0 ? ZOOM_FACTOR_OUT : ZOOM_FACTOR_IN;
    const newZoom = Math.min(ZOOM_MAX, Math.max(minZoom ?? 0.003, view.scale * factor));

    let newTx = svgPt.x - beforeWorld.x * newZoom;
    let newTy = svgPt.y - beforeWorld.y * newZoom;
    const clamped = clampOrigin(newTx, newTy);

    setZoom(() => newZoom);
    setOrigin(clamped);
  };

  const onBackgroundMouseDown = (e) => {
    if (tool === 'add') {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const c = clampToBounds(snap(x, MM_PER_GRID), snap(y, MM_PER_GRID));
      onAddNodeAt(c);
      return;
    }
    if (tool === 'pan') setPanDrag({ start: { x: e.clientX, y: e.clientY }, origin: { ...origin } });
  };

  const onBackgroundMouseMove = (e) => {
    if (panDrag && tool === 'pan') {
      const dx = e.clientX - panDrag.start.x;
      const dy = e.clientY - panDrag.start.y;
      const clamped = clampOrigin(panDrag.origin.x + dx, panDrag.origin.y + dy);
      setOrigin(clamped);
    }
  };

  const onBackgroundMouseUp = () => setPanDrag(null);

  const startNodeInteraction = (n, e) => {
    if (tool === 'edge') {
      if (!edgeStart) setEdgeStart(n);
      else if (edgeStart.code !== n.code) {
        onCreateEdge({ from: edgeStart.code, to: n.code });
        setEdgeStart(null);
      }
      e.stopPropagation();
      setNodePress({ code: n.code, sx: e.clientX, sy: e.clientY, moved: false });
      return;
    }

    setDragNode({
      code: n.code,
      start: screenToWorld(e.clientX, e.clientY),
      nodeStart: { x: n.x, y: n.y },
    });
    setNodePress({ code: n.code, sx: e.clientX, sy: e.clientY, moved: false });
    e.stopPropagation();
  };

  const onMouseMove = (e) => {
    if (dragNode && tool !== 'edge') {
      const now = screenToWorld(e.clientX, e.clientY);
      const dx = now.x - dragNode.start.x;
      const dy = now.y - dragNode.start.y;

      const n = nodes.find(v => k(v) === String(dragNode.code));
      if (n) {
        const nx = dragNode.nodeStart.x + dx;
        const ny = dragNode.nodeStart.y + dy;

        if (n.x !== nx || n.y !== ny) {
          onDragNode(dragNode.code, { x: nx, y: ny });
        }
      }
    }

    if (nodePress && !nodePress.moved) {
      const dpx = Math.hypot(e.clientX - nodePress.sx, e.clientY - nodePress.sy);
      if (dpx > DRAG_THRESHOLD_PX) setNodePress({ ...nodePress, moved: true });
    }

    setMouseWorld(screenToWorld(e.clientX, e.clientY));
  };

  const onMouseUp = () => {
    if (nodePress && !nodePress.moved && typeof onSelectNode === 'function') {
      onSelectNode(nodePress.code);
    }
    if (dragNode && typeof onDragNodeEnd === 'function') {
      const snapped = clampToBounds(
        snap(dragNode.nodeStart.x + (mouseWorld.x - dragNode.start.x), MM_PER_GRID),
        snap(dragNode.nodeStart.y + (mouseWorld.y - dragNode.start.y), MM_PER_GRID)
      );
      onDragNode(dragNode.code, snapped);
      onDragNodeEnd(dragNode.code, snapped, dragNode.nodeStart);
    }
    setDragNode(null);
    setNodePress(null);
  };
  const BOX_MM = Math.max(BOX_MIN_MM, Math.min(BOX_MAX_MM, BOX_TARGET_PX / (view.scale || 1)));
  const HALF = BOX_MM / 2;
  const HIT_BOX_MM = Math.max(BOX_MM * 1.6, NODE_HIT_TARGET_PX / (view.scale || 1));
  const HIT_HALF = HIT_BOX_MM / 2;

  const minArrowMm = MIN_ARROW_PX / (view.scale || 1);
  const BASE_ARROW_MM = Math.max(minArrowMm, BOX_MM * 0.7);

  const clampLen = (mm, maxMm) => Math.max(minArrowMm, Math.min(maxMm, mm));

  const dirVec = (direction, L) => {
    switch (direction) {
      case 'North': return { x: 0, y: -L };
      case 'South': return { x: 0, y: L };
      case 'East': return { x: L, y: 0 };
      case 'West': return { x: -L, y: 0 };
      default: return { x: 0, y: 0 };
    }
  };

  const edgePreview = edgeStart ? { from: edgeStart, to: mouseWorld } : null;
  const canvasCursor =
    tool === 'pan'
      ? (panDrag ? 'grabbing' : 'grab')
      : tool === 'edge'
        ? 'crosshair'
        : tool === 'add'
          ? 'copy'
          : 'default';

  return (
    <div className="relative w-full h-full overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full bg-white select-none"
        style={{ cursor: canvasCursor }}
        onWheel={onWheel}
        onMouseMove={(e) => { onMouseMove(e); onBackgroundMouseMove(e); }}
        onMouseUp={() => { onMouseUp(); onBackgroundMouseUp(); }}
        onMouseDown={onBackgroundMouseDown}
      >
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
          <rect
            x={bounds?.minX ?? 0}
            y={bounds?.minY ?? 0}
            width={(bounds?.maxX ?? 0) - (bounds?.minX ?? 0)}
            height={(bounds?.maxY ?? 0) - (bounds?.minY ?? 0)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>

        <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>

          {edges.map((e, idx) => {
            const A = nodes.find(n => String(n.code) === String(e.from));
            const B = nodes.find(n => String(n.code) === String(e.to));
            if (!A || !B) return null;
            const a = trPoint(A.x, A.y), b = trPoint(B.x, B.y);
            return (
              <g key={idx}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(255,255,255,0.85)" strokeWidth={5}
                  vectorEffect="non-scaling-stroke" />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#111827" strokeWidth={3}
                  vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}

          {edgePreview && (
            <g stroke="#2563eb" strokeDasharray="6 6" strokeWidth="2" vectorEffect="non-scaling-stroke">
              <line
                x1={trPoint(edgePreview.from.x, edgePreview.from.y).x}
                y1={trPoint(edgePreview.from.x, edgePreview.from.y).y}
                x2={trPoint(edgePreview.to.x, edgePreview.to.y).x}
                y2={trPoint(edgePreview.to.x, edgePreview.to.y).y}
              />
            </g>
          )}

          {nodes.map(n => {
            const p = trPoint(n.x, n.y);
            const isCharger = !!n.charger?.direction;
            const hasChute = !!n.chute?.direction;

            let chargerLen = isCharger ? clampLen(BASE_ARROW_MM, CHARGER_MAX_MM) : 0;
            let chuteLen = hasChute ? clampLen(BASE_ARROW_MM, CHUTE_MAX_MM) : 0;

            if (isCharger && hasChute && n.charger.direction === n.chute.direction) {
              const extendMm = EXTEND_PX_IF_BOTH / (view.scale || 1);
              chargerLen = clampLen(Math.max(chargerLen, chuteLen) + extendMm, CHARGER_MAX_MM);

              chuteLen = clampLen(Math.min(chuteLen, chargerLen - extendMm * 0.5), CHUTE_MAX_MM);
            }

            const chargerVec = isCharger ? dirVec(n.charger.direction, chargerLen) : null;
            const chuteVec = hasChute ? dirVec(n.chute.direction, chuteLen) : null;

            return (
              <g
                key={k(n)}
                transform={`translate(${p.x},${p.y})`}
                onMouseDown={(e) => startNodeInteraction(n, e)}
                className="select-none"
                style={{ cursor: dragNode?.code === n.code ? 'grabbing' : 'grab' }}
              >
                <rect
                  x={-HIT_HALF}
                  y={-HIT_HALF}
                  width={HIT_BOX_MM}
                  height={HIT_BOX_MM}
                  fill="transparent"
                  pointerEvents="all"
                />

               
                {chargerVec && (
                  <line
                    x1="0" y1="0" x2={chargerVec.x} y2={chargerVec.y}
                    stroke="#ea6300" strokeWidth={3}
                    markerEnd="url(#arrow-charger)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {chuteVec && (
                  <line
                    x1="0" y1="0" x2={chuteVec.x} y2={chuteVec.y}
                    stroke="#646d72" strokeWidth={3}
                    markerEnd="url(#arrow-chute)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                <rect
                  x={-HALF} y={-HALF} width={BOX_MM} height={BOX_MM}
                  rx={12} ry={12}
                  fill={isCharger ? '#ea6300' : hasChute ? '#646d72' : '#ea6300'}
                  stroke="white"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />

                {isCharger && (
                  <g transform={`scale(${BOX_MM / 22})`} pointerEvents="none">
                    <path d="M -4 -8 L 2 -8 L 0 0 L 6 0 L -1 10 L 0 2 L -6 2 Z" fill="white" />
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <defs>
          <marker id="arrow-chute" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#646d72" />
          </marker>
          <marker id="arrow-charger" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea6300" />
          </marker>
        </defs>
      </svg>
      <div
        className="absolute bottom-3"
        style={{
          left: 12 + (leftOffsetPx || 0),         
          transition: 'left 300ms ease',           
          willChange: 'left',
        }}
      >
        <ScaleBar zoom={view.scale} />
      </div>
      {dragNode && (
        <div className="pointer-events-none absolute left-3 top-16 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-slate-100 shadow-lg">
          Dragging node. Press Esc to cancel and restore its original position.
        </div>
      )}
      {!dragNode && tool !== 'pan' && (
        <div className="pointer-events-none absolute left-3 top-16 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-slate-100 shadow-lg">
          {tool === 'add' && 'Add Node mode: click once on the map to place a node.'}
          {tool === 'edge' && 'Add Edge mode: click a start node, then an end node. Press Esc to cancel.'}
        </div>
      )}
    </div>
  );
}

function ScaleBar({ zoom }) {
  const targetPx = 140;           
  const pxPerMm = zoom;           

  const candidatesMm = [
    100, 200, 500,
    1000, 2000, 5000,
    10000, 20000, 50000,
    100000, 200000
  ];

  let best = { mm: 1000, px: 1000 * pxPerMm, diff: Infinity };
  for (const mm of candidatesMm) {
    const px = mm * pxPerMm;
    const diff = Math.abs(px - targetPx);
    if (diff < best.diff) best = { mm, px, diff };
  }

  const label = best.mm >= 1000 ? `${best.mm / 1000} m` : `${best.mm} mm`;
  const widthPx = Math.max(30, Math.min(260, best.px));

  return (
    <div className="bg-white/85 backdrop-blur-sm border border-gray-300 rounded px-2 py-1 shadow">
      <div className="h-1.5 bg-gray-800" style={{ width: `${widthPx}px` }} />
      <div className="text-[10px] text-gray-700 text-center mt-1 leading-none">{label}</div>
    </div>
  );
}




