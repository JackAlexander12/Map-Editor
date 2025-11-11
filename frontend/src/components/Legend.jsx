import React from 'react';

export default function Legend({
  leftOffsetPx = 0,     
  animMs = 300,         
  gapPx = 12,          
  bottomGapPx = 12,     
  scaleBarHeightPx = 40,
  widthPx = 260,       
  minimized = false,
  onToggle = () => {}
}) {
  const bottom = bottomGapPx + scaleBarHeightPx;

  return (
    <div
      className="fixed z-20"
      style={{
        left: gapPx,
        bottom,
        transform: `translateX(${leftOffsetPx}px)`,        
        transition: `transform ${animMs}ms ease`,
        width: widthPx
      }}
    >
      <button
        onClick={onToggle}
        className="w-full bg-white/95 border border-gray-300 rounded-t px-2 py-1 text-xs font-medium flex items-center justify-between shadow"
      >
        <span>Legend</span>
        <span className="text-gray-500">{minimized ? 'Show' : 'Hide'}</span>
      </button>

      {!minimized && (
        <div className="bg-white/95 border border-t-0 border-gray-300 rounded-b p-2 shadow">
          <div className="space-y-2 text-xs text-gray-800">
            <Row label="Transit node">
              <Swatch fill="#ea6300" />
            </Row>
            <Row label="Charger">
              <Swatch fill="#ea6300" withBolt />
            </Row>
            <Row label="Chute">
              <Swatch fill="#646d72" />
            </Row>
            <Row label="Charger direction">
              <Arrow color="#ea6300" />
            </Row>
            <Row label="Chute direction">
              <Arrow color="#646d72" />
            </Row>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span>{label}</span>
    </div>
  );
}

function Swatch({ fill, withBolt = false }) {

  return (
    <div className="relative" style={{ width: 28, height: 28 }}>
      <div
        style={{
          width: 28, height: 28, borderRadius: 6,
          background: fill, border: '1.5px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
        }}
      />
      {withBolt && (
        <svg
          viewBox="-10 -12 20 24"
          style={{ position: 'absolute', left: 14, top: 14, transform: 'translate(-50%,-50%)', width: 16, height: 16 }}
        >
          <path d="M -4 -8 L 2 -8 L 0 0 L 6 0 L -1 10 L 0 2 L -6 2 Z" fill="white" />
        </svg>
      )}
    </div>
  );
}

function Arrow({ color }) {
  return (
    <svg width="42" height="12" viewBox="0 0 42 12">
      <line x1="2" y1="6" x2="38" y2="6" stroke={color} strokeWidth="3"
        markerEnd="url(#legend-arrowhead)" />
      <defs>
        <marker id="legend-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
    </svg>
  );
}



