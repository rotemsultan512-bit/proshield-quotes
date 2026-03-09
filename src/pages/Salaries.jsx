import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const emptyLine = () => ({
  key: Date.now() + Math.random(),
  product_id: '',
  qty: '',
  unit: 'מ"א',
  price_per_unit: '',
});

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    options.push({ val, label });
  }
  return options;
}

export default function Salaries() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [newWorkerName, setNewWorkerName] = useState('');

  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [mode, setMode] = useState('install');
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  // Saved entries for current month
  const [entries, setEntries] = useState([]);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Load products + workers
  useEffect(() => {
    supabase.from('products').select('*').order('id').then(({ data }) => setProducts(data || []));
    loadWorkers();
  }, []);

  async function loadWorkers() {
    const { data } = await supabase.from('workers').select('*').order('name');
    setWorkers(data || []);
  }

  // Load entries for selected month
  useEffect(() => {
    loadEntries();
  }, [selectedMonth]);

  async function loadEntries() {
    const { data } = await supabase
      .from('salaries')
      .select('*, workers(name)')
      .eq('month', selectedMonth)
      .order('created_at', { ascending: false });
    setEntries(data || []);
  }

  // Load existing salary entry for editing
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: salary } = await supabase
        .from('salaries')
        .select('*')
        .eq('id', id)
        .single();
      if (!salary) { navigate('/salaries'); return; }

      const { data: sLines } = await supabase
        .from('salary_lines')
        .select('*')
        .eq('salary_id', id)
        .order('id');

      setSelectedWorker(String(salary.worker_id));
      setSelectedMonth(salary.month);
      setMode(salary.mode);
      setLines(
        (sLines || []).map(l => ({
          key: l.id,
          product_id: String(l.product_id),
          qty: String(l.qty),
          unit: l.unit,
          price_per_unit: String(l.price_per_unit),
        }))
      );
      setLoaded(true);
    })();
  }, [id]);

  // Add worker
  async function addWorker() {
    const name = newWorkerName.trim();
    if (!name) return;
    const { data } = await supabase.from('workers').insert({ name }).select().single();
    if (data) {
      setWorkers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedWorker(String(data.id));
      setNewWorkerName('');
    }
  }

  // Line total
  function lineTotal(line) {
    const qty = Number(line.qty) || 0;
    const price = Number(line.price_per_unit) || 0;
    return qty * price;
  }

  // Grand total
  const grandTotal = useMemo(
    () => lines.reduce((sum, l) => sum + lineTotal(l), 0),
    [lines]
  );

  function updateLine(index, field, value) {
    setLines(prev => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines(prev => [...prev, emptyLine()]);
  }

  function removeLine(index) {
    setLines(prev => prev.filter((_, i) => i !== index));
  }

  // Save
  async function save() {
    if (!selectedWorker) {
      alert('נא לבחור עובד');
      return;
    }
    if (lines.every(l => !l.product_id)) {
      alert('נא להוסיף לפחות מוצר אחד');
      return;
    }
    setSaving(true);

    const salaryData = {
      worker_id: Number(selectedWorker),
      month: selectedMonth,
      mode,
      total: Math.round(grandTotal * 100) / 100,
    };

    let salaryId = id ? Number(id) : null;

    if (salaryId) {
      await supabase.from('salaries').update(salaryData).eq('id', salaryId);
      await supabase.from('salary_lines').delete().eq('salary_id', salaryId);
    } else {
      const { data } = await supabase.from('salaries').insert(salaryData).select().single();
      salaryId = data.id;
    }

    const lineRows = lines
      .filter(l => l.product_id)
      .map(l => ({
        salary_id: salaryId,
        product_id: Number(l.product_id),
        qty: Number(l.qty) || 0,
        unit: l.unit,
        price_per_unit: Number(l.price_per_unit) || 0,
        line_total: Math.round(lineTotal(l) * 100) / 100,
      }));

    if (lineRows.length > 0) {
      await supabase.from('salary_lines').insert(lineRows);
    }

    setSaving(false);
    alert('נשמר בהצלחה!');
    if (!id) {
      resetForm();
    }
    loadEntries();
  }

  function resetForm() {
    setLines([emptyLine()]);
    setMode('install');
    navigate('/salaries');
  }

  async function deleteEntry(e, entryId) {
    e.stopPropagation();
    if (!confirm('למחוק רשומה זו?')) return;
    await supabase.from('salaries').delete().eq('id', entryId);
    setEntries(prev => prev.filter(s => s.id !== entryId));
  }

  function formatCurrency(n) {
    return Number(n).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 });
  }

  if (id && !loaded) return <div className="empty">טוען...</div>;

  return (
    <div className="fade-in">
      <div className="header">{id ? 'עריכת משכורת' : 'משכורות קבלני משנה'}</div>

      {/* Month + Worker selection */}
      <div className="card">
        <div style={{ marginBottom: 10 }}>
          <label>חודש</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {monthOptions.map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>עובד / קבלן</label>
          <select value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)}>
            <option value="">בחר עובד...</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newWorkerName}
            onChange={e => setNewWorkerName(e.target.value)}
            placeholder="שם עובד חדש"
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && addWorker()}
          />
          <button className="btn btn-primary btn-sm" onClick={addWorker}>
            + הוסף עובד
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="card">
        <label>סוג עבודה</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${mode === 'install' ? 'btn-primary' : ''}`}
            style={mode !== 'install' ? { background: 'var(--surface2)', color: 'var(--text)' } : {}}
            onClick={() => setMode('install')}
          >
            התקנה
          </button>
          <button
            className={`btn btn-sm ${mode === 'supply' ? 'btn-primary' : ''}`}
            style={mode !== 'supply' ? { background: 'var(--surface2)', color: 'var(--text)' } : {}}
            onClick={() => setMode('supply')}
          >
            אספקה
          </button>
        </div>
      </div>

      {/* Product Lines */}
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
        שורות עבודה
      </div>

      {lines.map((line, i) => {
        const lt = lineTotal(line);
        return (
          <div className="line-card" key={line.key}>
            <div className="line-header">
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>שורה {i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {lt > 0 && (
                  <span className="line-total">{formatCurrency(lt)}</span>
                )}
                {lines.length > 1 && (
                  <button
                    className="btn btn-red btn-sm"
                    style={{ padding: '2px 8px' }}
                    onClick={() => removeLine(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="line-fields">
              <div className="full">
                <label>מוצר</label>
                <select
                  value={line.product_id}
                  onChange={e => updateLine(i, 'product_id', e.target.value)}
                >
                  <option value="">בחר מוצר...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>כמות</label>
                <input
                  type="number"
                  value={line.qty}
                  onChange={e => updateLine(i, 'qty', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>

              <div>
                <label>יחידה</label>
                <select
                  value={line.unit}
                  onChange={e => updateLine(i, 'unit', e.target.value)}
                >
                  <option value='מ"א'>מ"א</option>
                  <option value='מ"ר'>מ"ר</option>
                  <option value="יח'">יח'</option>
                </select>
              </div>

              <div>
                <label>מחיר לעובד ₪</label>
                <input
                  type="number"
                  value={line.price_per_unit}
                  onChange={e => updateLine(i, 'price_per_unit', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        );
      })}

      <button className="btn btn-primary btn-block" onClick={addLine} style={{ marginBottom: 16 }}>
        + הוסף שורה
      </button>

      {/* Summary */}
      <div className="summary">
        <div className="summary-row total">
          <span>סה״כ לתשלום לעובד</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-primary btn-block"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'שומר...' : id ? 'עדכן' : 'שמור'}
        </button>
        {id && (
          <button className="btn btn-primary" onClick={resetForm} style={{ background: 'var(--surface2)', color: 'var(--text)' }}>
            חדש
          </button>
        )}
      </div>

      {/* History for this month */}
      {!id && entries.length > 0 && (
        <>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginTop: 24, marginBottom: 8 }}>
            רשומות לחודש זה
          </div>
          {entries.map(e => (
            <div
              className="history-item"
              key={e.id}
              onClick={() => navigate(`/salaries/${e.id}`)}
            >
              <div style={{ flex: 1 }}>
                <div className="title">{e.workers?.name || 'עובד'}</div>
                <div className="meta">
                  {e.mode === 'install' ? 'התקנה' : 'אספקה'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                  {formatCurrency(e.total)}
                </span>
                <button
                  className="btn btn-red btn-sm"
                  onClick={ev => deleteEntry(ev, e.id)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
