import React, { useEffect, useMemo, useState } from 'react';
import Toolbar from './components/Toolbar';
import NodeForm from './components/NodeForm';
import MapCanvas from './components/MapCanvas';
import Button from './components/ui/button';
import Toasts from './components/ui/Toast';
import { api } from './api';
import { k } from './lib';
import ImporterModal from './components/Importer';
import LeftPanel from './components/LeftPanel';
import Legend from './components/Legend';
import ConfirmModal from './components/ConfirmModal';


let tid = 0;
const ZOOM_MAX = 5;
const LEFT_PANEL_W = 320;
const RIGHT_PANEL_W = 384;
const DEFAULT_BOUNDS = { minX: 0, minY: 0, maxX: 150000, maxY: 150000 };
const LEFT_PANEL_OVERLAY_OFFSET = LEFT_PANEL_W + 16;

function edgeLength(a, b) {
  if (a.x === b.x) return Math.abs(a.y - b.y);
  if (a.y === b.y) return Math.abs(a.x - b.x);
  return Infinity;
}

function getInvalidIncidentEdges(nodes, edges, nodeCode, nextPosition, maxNeighborDistance) {
  const nextNodes = nodes.map((node) =>
    String(node.code) === String(nodeCode) ? { ...node, ...nextPosition } : node
  );
  const getNode = (code) => nextNodes.find((node) => String(node.code) === String(code));

  return (edges || []).filter((edge) => {
    if (String(edge.from) !== String(nodeCode) && String(edge.to) !== String(nodeCode)) {
      return false;
    }

    const fromNode = getNode(edge.from);
    const toNode = getNode(edge.to);
    if (!fromNode || !toNode) return true;

    const len = edgeLength(fromNode, toNode);
    return !Number.isFinite(len) || len <= 0 || len > maxNeighborDistance;
  });
}

function getRequestErrorMessage(error, fallback) {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.status) {
    const detail =
      typeof error.response.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response.data || {});
    return `Request failed with HTTP ${error.response.status}. ${detail || fallback}`;
  }
  if (error?.request && !error?.response) {
    const code = error?.code ? ` (${error.code})` : '';
    return `Request reached the network layer but no backend response came back${code}. Check that the backend is running on port 5000 and that the frontend can reach it.`;
  }
  if (error?.message === 'Network Error') {
    return 'Request failed before the backend responded. Check that the backend is running on port 5000 and that local CORS is allowed.';
  }
  if (error?.message) return error.message;
  return fallback;
}

export default function App() {
  const [map, setMap] = useState({
    map: {
      maxNeighborDistance: 1500,
      bounds: DEFAULT_BOUNDS,
      nodes: [],
      edges: [],
    }
  });


  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tool, setTool] = useState('pan');
  const [panelOpen, setPanelOpen] = useState(true);
  const [leftOpen, setLeftOpen] = useState(false);
  const [legendMinimized, setLegendMinimized] = useState(false);


  const [showImporter, setShowImporter] = useState(false);
  const [pendingMoveConfirm, setPendingMoveConfirm] = useState(null);


  const [zoom, setZoom] = useState(0.8);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [minZoom, setMinZoom] = useState(0.1);


  const [toasts, setToasts] = useState([]);
  const toast = (message, type = 'info') => {
    const id = ++tid;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 1800);
  };
  const closeToast = (id) => setToasts(t => t.filter(x => x.id !== id));


  const nodes = map.map.nodes;
  const edges = map.map.edges || [];
  const [maxNeighborDistance, setMaxNeighborDistance] = useState(1500);
  const [bounds, setBounds] = useState(map.map.bounds || DEFAULT_BOUNDS);


  useEffect(() => {
    api.getMap()
      .then(m => { setMap(m); setTimeout(fitToBounds, 0); })
      .catch(() => toast('Failed to load map', 'error'));
  }, []);


  useEffect(() => {
    const serverCap = map?.map?.maxNeighborDistance;
    if (Number.isFinite(serverCap)) setMaxNeighborDistance(serverCap);
    const b = map?.map?.bounds;
    if (b && Number.isFinite(b.minX) && Number.isFinite(b.maxX)) setBounds(b);
  }, [map?.map?.maxNeighborDistance, map?.map?.bounds]);

  useEffect(() => { setTimeout(fitToBounds, 0); }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setTool('pan'); return; }
      if (e.key === '1') setTool('pan');
      if (e.key === '2') setTool('add');
      if (e.key === '3') setTool('edge');
      if (e.key === 'r' || e.key === 'R') fitToBounds();
      if (e.key === ']') setPanelOpen(true);
      if (e.key === '[') setPanelOpen(false);
      if (e.key === '\\') setLeftOpen(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bounds]);

  useEffect(() => { if (tool !== 'pan') toast('Tip: press Esc to exit the current tool.'); }, [tool]);

  useEffect(() => {
    if (!minZoom) return;
    const EPS = 1.02;
    if (zoom <= minZoom * EPS) {
      setLegendMinimized(false);
    }
  }, [zoom, minZoom]);

  const fitToBounds = () => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) return;
    const W = svgEl.clientWidth || 1000;
    const H = svgEl.clientHeight || 600;

    const boxWidth = (bounds.maxX ?? DEFAULT_BOUNDS.maxX) - (bounds.minX ?? 0);
    const boxHeight = (bounds.maxY ?? DEFAULT_BOUNDS.maxY) - (bounds.minY ?? 0);

    const zoomX = (W * 0.85) / boxWidth;
    const zoomY = (H * 0.85) / boxHeight;
    const z = Math.min(zoomX, zoomY);

    setMinZoom(z);
    setZoom(z);

    const offsetX = (W - boxWidth * z) / 2 - (bounds.minX ?? 0) * z;
    const offsetY = (H - boxHeight * z) / 2 - (bounds.minY ?? 0) * z;
    setOrigin({ x: offsetX, y: offsetY });
    setLegendMinimized(false);
  };

  const onSelectNode = (code) => {
    setSelected({ code: String(code) });
    setShowForm(true);
    setPanelOpen(true);
  };

  const applyImport = async (parsed) => {
    try {
      await api.putMap(parsed);
      setMap(parsed);
      const cap = parsed.map.maxNeighborDistance;
      if (Number.isFinite(cap)) setMaxNeighborDistance(cap);
      setSelected(null);
      setShowForm(false);
      setTool('pan');
      setTimeout(fitToBounds, 0);
      return true;
    } catch (e) {
      const msg = getRequestErrorMessage(e, 'Replace failed.');
      throw new Error(msg);
    }
  };

  const saveAll = async () => {
    try {
      await api.putMap({ map: { maxNeighborDistance, bounds, nodes, edges } });
      toast('Map saved');
    } catch (e) {
      toast(getRequestErrorMessage(e, 'Save failed'), 'error');
    }
  };

  const onDragNode = (code, patch) => {
    setMap(m => ({
      map: {
        ...m.map,
        nodes: m.map.nodes.map(n => String(n.code) === String(code) ? { ...n, ...patch } : n),
        edges: m.map.edges || []
      }
    }));
  };

  const commitNodeMove = async (code, finalPosition) => {
    const n = finalPosition || map.map.nodes.find((node) => String(node.code) === String(code));
    if (!n) return;

    try {
      const res = await api.patchNode(code, { x: n.x, y: n.y });
      setMap((m) => ({
        map: {
          ...m.map,
          nodes: m.map.nodes.map((node) => String(node.code) === String(code) ? res.node : node),
          edges: Array.isArray(res.edges) ? res.edges : m.map.edges,
        }
      }));
      if (Array.isArray(res.removedEdges) && res.removedEdges.length > 0) {
        toast(
          `Warning: moving this node removed ${res.removedEdges.length} edge${res.removedEdges.length === 1 ? '' : 's'} because they no longer met edge rules.`,
          'error'
        );
      }
    } catch (e) {
      toast(getRequestErrorMessage(e, 'Move not allowed'), 'error');
      const m = await api.getMap();
      setMap(m);
    }
  };

  const onDragNodeEnd = async (code, finalPosition, originalPosition) => {
    const n = finalPosition || map.map.nodes.find(n => String(n.code) === String(code));
    if (!n) return;
    const invalidEdges = getInvalidIncidentEdges(
      map.map.nodes,
      map.map.edges || [],
      code,
      n,
      maxNeighborDistance
    );

    if (invalidEdges.length > 0) {
      setPendingMoveConfirm({
        code,
        finalPosition: n,
        originalPosition,
        invalidEdges,
      });
      return;
    }

    await commitNodeMove(code, n);
  };

  const onCreateEdge = async ({ from, to }) => {
    try {
      const res = await api.addEdge({ from, to });
      setMap(m => ({ map: { ...m.map, edges: [...(m.map.edges || []), res.edge] } }));
      setTool('pan');
      toast('Edge created');
    } catch (e) {
      toast(getRequestErrorMessage(e, 'Failed to create edge'), 'error');
    }
  };

  const handleDeleteNode = async (code) => {
    if (!confirm(`Delete node ${code}?`)) return;
    try {
      await api.deleteNode(code);
      setMap(m => ({
        map: {
          ...m.map,
          nodes: m.map.nodes.filter(n => String(n.code) !== String(code)),
          edges: (m.map.edges || []).filter(e =>
            String(e.from) !== String(code) && String(e.to) !== String(code)
          )
        }
      }));
      setSelected(null);
      toast('Node deleted');
    } catch (e) { toast(getRequestErrorMessage(e, 'Delete failed'), 'error'); }
  };

  const saveNode = async (node) => {
    const exists = nodes.some(n => String(n.code) === String(node.code));
    try {
      if (exists) {
        const res = await api.updateNode(node.code, node);
        setMap(m => ({
          map: {
            ...m.map,
            nodes: m.map.nodes.map(n => String(n.code) === String(node.code) ? res.node : n),
            edges: m.map.edges || []
          }
        }));
        setSelected({ code: node.code });
        setPanelOpen(true);
        setShowForm(true);
        toast('Node updated');
      } else {
        const res = await api.addNode(node);
        setMap(m => ({
          map: { ...m.map, nodes: [...m.map.nodes, res.node], edges: m.map.edges || [] }
        }));
        setSelected({ code: res.node.code });
        setPanelOpen(true);
        setShowForm(true);
        setTool('pan');
        toast('Node created');
      }
    } catch (e) {
      const message = getRequestErrorMessage(e, 'Save failed');
      console.error('Failed to save node', { node, error: e });
      toast(message, 'error');
      throw new Error(message);
    }
  };

  const selectedNode = useMemo(
    () => selected && nodes.find(n => String(n.code) === String(selected.code)),
    [selected, nodes]
  );
  const toolLabel =
    tool === 'pan' ? 'Pan' :
    tool === 'add' ? 'Add Node' :
    tool === 'edge' ? 'Add Edge' :
    tool;

  return (
    <div className="h-full flex flex-col relative">
      <Toolbar
        onZoomIn={() => setZoom(z => Math.min(ZOOM_MAX, z * 1.1))}
        onZoomOut={() => setZoom(z => Math.max(minZoom, z * 0.9))}
        onReset={fitToBounds}
        leftOffsetPx={0}
        animMs={300}
      />
      <LeftPanel
        isOpen={leftOpen}
        onToggle={() => setLeftOpen(v => !v)}
        nodes={nodes}
        edges={edges}
        selectedNode={selectedNode}
        onClickNodeEdit={(code) => {
          setSelected({ code });
          setShowForm(true);
          setTool('pan');
          setPanelOpen(true);
        }}
        onClickNodeDelete={handleDeleteNode}
        onClickEdgeDelete={(e) => {
          if (!confirm(`Delete edge ${e.from} ⇄ ${e.to}?`)) return;
          api.deleteEdge({ from: e.from, to: e.to })
            .then(() => {
              setMap(m => ({
                map: {
                  ...m.map,
                  edges: (m.map.edges || []).filter(x =>
                    !((String(x.from) === String(e.from) && String(x.to) === String(e.to)) ||
                      (String(x.from) === String(e.to) && String(x.to) === String(e.from)))
                  )
                }
              }));
              toast('Edge deleted');
            })
            .catch(err => toast(err?.response?.data?.error || 'Delete failed', 'error'));
        }}
      />
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <MapCanvas
            nodes={nodes}
            edges={edges}
            tool={tool}
            zoom={zoom}
            setZoom={setZoom}
            origin={origin}
            setOrigin={setOrigin}
            rotateView={false}
            bounds={bounds}
            onAddNodeAt={(pt) => {
              setSelected({ ...pt, code: '' });
              setShowForm(true);
              setTool('pan');
              setPanelOpen(true);
            }}
            onDragNode={onDragNode}
            onCreateEdge={onCreateEdge}
            onSelectNode={onSelectNode}
            onDragNodeEnd={onDragNodeEnd}
            maxNeighborDistance={maxNeighborDistance}
            minZoom={minZoom}
            leftOffsetPx={leftOpen ? LEFT_PANEL_OVERLAY_OFFSET : 0}
          />
        </div>
        <Legend
          leftOffsetPx={leftOpen ? LEFT_PANEL_OVERLAY_OFFSET : 0}
          scaleBarLeftGapPx={12}
          scaleBarHeightPx={40}
          gapPx={12}
          widthPx={180}
          minimized={legendMinimized}
          onToggle={() => setLegendMinimized(m => !m)}
        />
        <div
          className={`details-panel absolute right-3 top-16 z-30 overflow-hidden rounded-[26px] transition-[width,height,border-radius,background-color,border-color] duration-300 ease-out ${
            panelOpen ? 'border border-gray-300 bg-[rgba(249,249,251,0.96)]' : 'border border-transparent bg-transparent'
          }`}
          style={{
            width: panelOpen ? '24rem' : '8.5rem',
            height: panelOpen ? 'calc(100% - 1.5rem)' : '3.25rem',
            maxWidth: 'calc(100vw - 1.5rem)',
            willChange: 'width, height',
          }}
        >
          <div className={`flex items-center justify-between ${panelOpen ? 'px-4 py-2' : 'px-0 py-0'}`}>
            <button
              onClick={() => setPanelOpen((p) => !p)}
              aria-label={panelOpen ? 'Hide tools' : 'Show tools'}
              title={panelOpen ? 'Hide tools' : 'Show tools'}
              className={`flex items-center gap-2 rounded-full border border-[#d55a00] bg-[#ea6300] text-sm font-medium text-white transition-colors hover:bg-[#ff7a1a] ${
                panelOpen ? 'h-9 px-3' : 'h-[3.25rem] w-full justify-center px-4'
              }`}
            >
              <span className="leading-none">{panelOpen ? '−' : '+'}</span>
              <span>Tools</span>
            </button>
            {panelOpen && (
              <div className="pointer-events-none rounded-full border border-white/20 bg-slate-950/80 px-3 py-1 text-xs font-medium text-slate-100">
                {toolLabel}
              </div>
            )}
          </div>

          <div
            className="h-[calc(100%-3.25rem)] overflow-y-auto px-4 pb-4 transition-opacity duration-200"
            style={{
              opacity: panelOpen ? 1 : 0,
              pointerEvents: panelOpen ? 'auto' : 'none',
            }}
          >
            <div className="space-y-3 mb-3 pt-1">
              <h2 className="panel-title">Tools</h2>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Pan</div>
                  <Button active={tool === 'pan'} onClick={() => setTool('pan')}>Pan</Button>
                </div>
                <div className="text-xs text-gray-600 mt-1">Shortcut: 1. Drag background to move the map.</div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Add Node</div>
                  <Button active={tool === 'add'} onClick={() => setTool('add')}>
                    Add Node
                  </Button>
                </div>
                <div className="text-xs text-gray-600 mt-1">Shortcut: 2. Click anywhere in the map to place a node.</div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Add Edge</div>
                  <Button active={tool === 'edge'} onClick={() => setTool('edge')}>
                    Start Edge
                  </Button>
                </div>
                <div className="text-xs text-gray-600 mt-1">Shortcut: 3. Click a start node, then an end node.</div>
              </div>
              <div className="card">
                <div className="font-medium mb-2">Constraints</div>
                <label className="label">Max Neighbor Distance (millimeters)</label>
                <input
                  type="number"
                  className="input w-full no-spinner"
                  value={maxNeighborDistance}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || '0', 10);
                    setMaxNeighborDistance(Number.isFinite(n) ? n : 0);
                  }}
                />

                <div className="label mt-2">Warehouse Size (millimeters)</div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="input w-28 no-spinner"
                    value={bounds.maxX}
                    onChange={(e) => setBounds(b => ({ ...b, minX: 0, maxX: Math.max(0, +e.target.value || 0) }))}
                    min={0}
                  />
                  <span>×</span>
                  <input
                    type="number"
                    className="input w-28 no-spinner"
                    value={bounds.maxY}
                    onChange={(e) => setBounds(b => ({ ...b, minY: 0, maxY: Math.max(0, +e.target.value || 0) }))}
                    min={0}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">(origin at 0,0)</div>

                <div className="flex gap-2 mt-3">
                  <Button variant="primary" onClick={saveAll}>Save Map</Button>
                  <Button onClick={fitToBounds}>Fit to Bounds</Button>
                </div>
              </div>
              <div className="card">
                <div className="font-medium mb-2">Replace Map from JSON</div>
                <Button onClick={() => setShowImporter(true)}>Open Importer</Button>
              </div>
            </div>

            {showForm ? (
              <NodeForm
                initial={selectedNode || (selected ? { ...selected } : null)}
                onSubmit={saveNode}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <p className="text-gray-500 text-sm">Select a node to edit, or create a new node.</p>
            )}
          </div>
        </div>

      </div>

      <Toasts items={toasts} onClose={closeToast} />
      <ImporterModal
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onReplace={applyImport}
      />
      <ConfirmModal
        isOpen={!!pendingMoveConfirm}
        title="Remove Connected Edges?"
        message={
          pendingMoveConfirm
            ? `Moving this node will remove ${pendingMoveConfirm.invalidEdges.length} connected edge${pendingMoveConfirm.invalidEdges.length === 1 ? '' : 's'} because they will no longer meet edge rules. Do you want to continue?`
            : ''
        }
        confirmLabel="Move Node"
        cancelLabel="Keep Position"
        confirmVariant="danger"
        onCancel={() => {
          if (pendingMoveConfirm?.originalPosition) {
            onDragNode(pendingMoveConfirm.code, pendingMoveConfirm.originalPosition);
          }
          setPendingMoveConfirm(null);
        }}
        onConfirm={async () => {
          const pending = pendingMoveConfirm;
          setPendingMoveConfirm(null);
          if (!pending) return;
          await commitNodeMove(pending.code, pending.finalPosition);
        }}
      />
    </div>
  );
}

