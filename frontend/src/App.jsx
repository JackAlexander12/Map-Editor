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


let tid = 0;
const ZOOM_MAX = 5;
const LEFT_PANEL_W = 320;
const RIGHT_PANEL_W = 384;

export default function App() {
  const [map, setMap] = useState({
    map: {
      maxNeighborDistance: 1500,
      bounds: { minX: 0, minY: 0, maxX: 10000, maxY: 6000 },
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
  const [bounds, setBounds] = useState(map.map.bounds || { minX: 0, minY: 0, maxX: 10000, maxY: 6000 });


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

    const boxWidth = (bounds.maxX ?? 10000) - (bounds.minX ?? 0);
    const boxHeight = (bounds.maxY ?? 6000) - (bounds.minY ?? 0);

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
      const msg = e?.response?.data?.error || 'Replace failed.';
      throw new Error(msg);
    }
  };

  const saveAll = async () => {
    try {
      await api.putMap({ map: { maxNeighborDistance, bounds, nodes, edges } });
      toast('Map saved');
    } catch (e) {
      toast(e?.response?.data?.error || 'Save failed', 'error');
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

  const onDragNodeEnd = async (code) => {
    const n = map.map.nodes.find(n => String(n.code) === String(code));
    if (!n) return;
    try {
      await api.patchNode(code, { x: n.x, y: n.y });
    } catch (e) {
      toast(e?.response?.data?.error || 'Move not allowed', 'error');
      const m = await api.getMap();
      setMap(m);
    }
  };

  const onCreateEdge = async ({ from, to }) => {
    try {
      const res = await api.addEdge({ from, to });
      setMap(m => ({ map: { ...m.map, edges: [...(m.map.edges || []), res.edge] } }));
      toast('Edge created');
    } catch (e) {
      toast(e?.response?.data?.error || 'Failed to create edge', 'error');
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
    } catch (e) { toast(e?.response?.data?.error || 'Delete failed', 'error'); }
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
        toast('Node created');
      }
    } catch (e) {
      toast(e?.response?.data?.error || 'Save failed', 'error');
    }
  };

  const selectedNode = useMemo(
    () => selected && nodes.find(n => String(n.code) === String(selected.code)),
    [selected, nodes]
  );

  return (
    <div className="h-full flex flex-col relative">
      <Toolbar
        onZoomIn={() => setZoom(z => Math.min(ZOOM_MAX, z * 1.1))}
        onZoomOut={() => setZoom(z => Math.max(minZoom, z * 0.9))}
        onReset={fitToBounds}
        leftOffsetPx={leftOpen ? LEFT_PANEL_W : 0}
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
            onAddNodeAt={(pt) => { setSelected({ ...pt, code: '' }); setShowForm(true); setTool('add'); setPanelOpen(true); }}
            onDragNode={onDragNode}
            onCreateEdge={onCreateEdge}
            onSelectNode={onSelectNode}
            onDragNodeEnd={onDragNodeEnd}
            maxNeighborDistance={maxNeighborDistance}
            minZoom={minZoom}
            leftOffsetPx={leftOpen ? LEFT_PANEL_W : 0}
          />
        </div>
        <Legend
          leftOffsetPx={leftOpen ? LEFT_PANEL_W : 0}
          scaleBarLeftGapPx={12}
          scaleBarHeightPx={40}
          gapPx={12}
          widthPx={180}
          minimized={legendMinimized}
          onToggle={() => setLegendMinimized(m => !m)}
        />

        {/* Right sliding tools panel */}
        <div
          className={`details-panel w-96 border-l p-3 overflow-y-auto h-full absolute top-0`}
          style={{
            right: 0,
            paddingTop: '48px',
            transform: `translateX(${panelOpen ? 0 : RIGHT_PANEL_W}px)`,
            zIndex: 20,
            transition: 'transform 200ms ease-out',
            willChange: 'transform'
          }}

        >

          <div className="space-y-3 mb-3">
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
        <button
          onClick={() => setPanelOpen(p => !p)}
          aria-label={panelOpen ? 'Hide tools' : 'Show tools'}
          title={panelOpen ? 'Hide tools' : 'Show tools'}
          className="fixed top-1/2 -translate-y-1/2 w-5 h-20 bg-[#ea6300] text-white shadow rounded-l-full flex items-center justify-center"
          style={{
            right: panelOpen ? `${RIGHT_PANEL_W}px` : '0px',
            transition: 'right 200ms ease-out, background-color 150ms'
          }}
        >
          <span className="text-lg leading-none select-none">{panelOpen ? '›' : '‹'}</span>
        </button>

      </div>

      <Toasts items={toasts} onClose={closeToast} />
      <ImporterModal
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onReplace={applyImport}
      />
    </div>
  );
}

