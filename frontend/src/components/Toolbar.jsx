import React from 'react';
import Button from './ui/button';
import logoUrl from '../assets/mujinlogo.png';


export default function Toolbar({
  onZoomIn,
  onZoomOut,
  onReset,                
  leftOffsetPx = 0,       
  animMs = 300
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 bg-[#ea6300] h-12 shadow"
      role="banner"
      aria-label="Top toolbar"
    >
      <div
        className="h-full flex items-center"
        style={{
          transform: `translateX(${leftOffsetPx}px)`,
          transition: `transform ${animMs}ms ease`,
        }}
      >
        <div className="h-full flex items-center px-2">
          <div className="mujin-logo-pill">
            <img
              src={logoUrl}
              alt="MUJIN"
              className="block h-6 w-auto"
              draggable="false"
            />
          </div>
        </div>
      </div>
      <div className="absolute inset-y-0 right-2 flex items-center gap-2">
        <Button onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">–</Button>
        <Button onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">+</Button>
        <Button onClick={onReset} title="Fit to Bounds">Fit to Bounds</Button>
      </div>
    </div>
  );
}







