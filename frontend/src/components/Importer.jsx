import React, { useEffect, useRef, useState } from 'react';
import Button from './ui/button';

export default function ImporterModal({ isOpen, onClose, onReplace }) {
  const [text, setText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasError, setHasError] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef(null);
  const clearTimer = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 0);
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
        if (clearTimer.current) clearTimeout(clearTimer.current);
        setHasError(false);
        setErrorMsg('');
        setConfirmStep(false);
        setIsSubmitting(false);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showInlineError = (msg) => {
    setErrorMsg(msg || 'Invalid JSON.');
    setHasError(true);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      setHasError(false);
      setErrorMsg('');
    }, 2500);
  };

  const validateJSON = () => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      showInlineError('Invalid JSON.');
      return null;
    }
    if (!parsed?.map || !Array.isArray(parsed.map.nodes) || parsed.map.edges == null) {
      showInlineError('JSON must include { "map": { "nodes": [], "edges": [] } }.');
      return null;
    }
    return parsed;
  };

  const handleReplaceClick = () => {
    const parsed = validateJSON();
    if (!parsed) return;
    setConfirmStep(true);
  };

  const handleConfirmReplace = async () => {
    const parsed = validateJSON();
    if (!parsed) { 

      setConfirmStep(false);
      return;
    }

    try {
      setIsSubmitting(true);
      await onReplace(parsed);

      setText('');
      setConfirmStep(false);
      setIsSubmitting(false);
      onClose();
    } catch (e) {

      const msg = e?.message || 'Replace failed.';
      setIsSubmitting(false);
      setConfirmStep(false);  
      showInlineError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-[min(1100px,95vw)] h-[min(800px,90vh)] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="font-semibold text-[#ea6300] text-lg">Replace Map from JSON</div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-5 relative">
          {!confirmStep ? (
            <>
              <div className="text-sm mb-3">
                <b className="text-[#ea6300]">Warning:</b> This will <b>completely replace</b> your map.
              </div>

              <textarea
                ref={textareaRef}
                className={
                  `input w-full flex-1 resize-none text-sm !bg-white !text-gray-800 border rounded p-2
                   ${hasError ? '!border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`
                }
                placeholder='Paste JSON like: { "map": { "maxNeighborDistance": ..., "nodes": [...], "edges": [...] } }'
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {errorMsg && (
                <div className="absolute left-4 bottom-4 bg-red-600 text-white text-xs px-3 py-1 rounded shadow">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-5">
              <div className="text-lg font-semibold text-[#ea6300]">
                Are you sure you want to replace the entire map?
              </div>
              <div className="text-sm text-gray-600 max-w-[80%]">
                This will permanently remove your current map data and load the new JSON content.
                This action <b>cannot be undone</b>.
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="danger" onClick={handleConfirmReplace} disabled={isSubmitting}>
                  {isSubmitting ? 'Replacing…' : 'Yes, Replace'}
                </Button>
                <Button onClick={() => setConfirmStep(false)} disabled={isSubmitting}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {!confirmStep && (
          <div className="px-5 py-3 border-t flex items-center justify-end gap-2 bg-gray-50">
            <Button variant="danger" onClick={handleReplaceClick}>Replace Map</Button>
            <Button onClick={onClose}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}