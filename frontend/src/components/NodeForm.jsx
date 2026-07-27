import React, { useState, useEffect } from 'react';
import { DIRS, scrubOptional } from '../lib';
import Button from './ui/button';

export default function NodeForm({ initial, onSubmit, onCancel }) {
  const empty = {
    x: 0,
    y: 0,
    code: '',
    name: null,
    directions: [],
    charger: undefined,
    chute: undefined,
  };

  const [form, setForm] = useState(empty);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        x: initial.x ?? 0,
        y: initial.y ?? 0,
        code: initial.code ?? '',
        name: initial.name ?? null,
        directions: Array.isArray(initial.directions) ? initial.directions : [],
        charger: initial.charger ?? undefined,
        chute: initial.chute ?? undefined,
      });
    } else {
      setForm(empty);
    }
    setErrorMsg('');
    setIsSubmitting(false);
  }, [initial?.code, initial?.x, initial?.y, initial?.name, initial?.charger?.direction, initial?.chute?.direction]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const setCharger = (val) => {
    if (val === 'NONE') set({ charger: undefined });
    else set({ charger: { direction: val } });
  };
  const setChute = (val) => {
    if (val === 'NONE') set({ chute: undefined });
    else set({ chute: { direction: val } });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedName = typeof form.name === 'string' ? form.name.trim() : form.name;
    const payload = scrubOptional({
      ...form,
      code: Number(form.code),
      name: trimmedName || null,
      x: +form.x,
      y: +form.y,
    });
    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } catch (err) {
      setErrorMsg(err?.message || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chargerValue = form.charger?.direction ?? 'NONE';
  const chuteValue = form.chute?.direction ?? 'NONE';

  return (
    <form className="space-y-4 bg-[#f7f8f9] p-4 rounded-lg shadow-sm" onSubmit={submit}>
      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <div>
          <div className="text-[#ea6300] font-semibold text-sm uppercase tracking-wide">Details</div>
          <div className="text-base font-semibold text-[#333]">
            {form.code ? `Edit Node #${form.code}` : 'Add Node'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label">Code</div>
          <input
            className="input w-full"
            type="number"
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
            required
          />
        </div>
        <div>
          <div className="label">Name</div>
          <input
            className="input w-full"
            placeholder="Leave blank if none"
            value={form.name || ''}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label">X (millimeters)</div>
          <input
            className="input w-full"
            type="number"
            value={form.x}
            onChange={(e) => set({ x: e.target.value })}
            required
          />
        </div>
        <div>
          <div className="label">Y (millimeters)</div>
          <input
            className="input w-full"
            type="number"
            value={form.y}
            onChange={(e) => set({ y: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label">Charger</div>
          <select
            className="input w-full"
            value={chargerValue}
            onChange={(e) => setCharger(e.target.value)}
          >
            <option value="NONE">None</option>
            {DIRS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label">Chute</div>
          <select
            className="input w-full"
            value={chuteValue}
            onChange={(e) => setChute(e.target.value)}
          >
            <option value="NONE">None</option>
            {DIRS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Node'}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      </div>
      {errorMsg && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
    </form>
  );
}


