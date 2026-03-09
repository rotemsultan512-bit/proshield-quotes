import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const emptyLine = () => ({
  key: Date.now() + Math.random(),
  product_id: '',
  qty: '',
  with_install: false,
  labor_cost: '',
});

export default function NewQuote() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [profitMode, setProfitMode] = useState('percent');
  const [profitValue, setProfitValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  // Load products
  useEffect(() => {
    supabase.from('products').select('*').order('id').then(({ data }) => {
      setProducts(data || []);
    });
  }, []);

  // Load existing quote
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();
      if (!quote) { navigate('/'); return; }

      const { data: qLines } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', id)
        .order('id');

      setProjectName(quote.project_name);
      setClientName(quote.client_name);
      setProfitMode(quote.profit_mode);
      setProfitValue(String(quote.profit_value));
      setLines(
        (qLines || []).map(l => ({
          key: l.id,
          product_id: String(l.product_id),
          qty: String(l.qty),
          with_install: l.with_install,
          labor_cost: String(l.labor_cost || ''),
        }))
      );
      setLoaded(true);
    })();
  }, [id]);

  // Product map for quick lookup
  const productMap = useMemo(() => {
    const m = {};
    products.forEach(p => { m[p.id] = p; });
    return m;
  }, [products]);

  // Calculate line total
  function lineTotal(line) {
    const product = productMap[line.product_id];
    if (!product) return 0;
    const qty = Number(line.qty) || 0;
    const material = product.cost_price;
    const labor = line.with_install ? (Number(line.labor_cost) || 0) : 0;
    return (material + labor) * qty;
  }

  // Totals
  const totalCost = useMemo(
    () => lines.reduce((sum, l) => sum + lineTotal(l), 0),
    [lines, productMap]
  );

  const profitAmount = useMemo(() => {
    const pv = Number(profitValue) || 0;
    if (profitMode === 'percent') return totalCost * (pv / 100);
    return pv;
  }, [totalCost, profitMode, profitValue]);

  const saleTotal = totalCost + profitAmount;

  // Update a line
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
    if (!projectName.trim() || !clientName.trim()) {
      alert('נא למלא שם פרויקט ושם לקוח');
      return;
    }
    if (lines.every(l => !l.product_id)) {
      alert('נא להוסיף לפחות מוצר אחד');
      return;
    }
    setSaving(true);

    const quoteData = {
      project_name: projectName.trim(),
      client_name: clientName.trim(),
      profit_mode: profitMode,
      profit_value: Number(profitValue) || 0,
      total_cost: Math.round(totalCost * 100) / 100,
      sale_total: Math.round(saleTotal * 100) / 100,
    };

    let quoteId = id ? Number(id) : null;

    if (quoteId) {
      await supabase.from('quotes').update(quoteData).eq('id', quoteId);
      await supabase.from('quote_lines').delete().eq('quote_id', quoteId);
    } else {
      const { data } = await supabase.from('quotes').insert(quoteData).select().single();
      quoteId = data.id;
    }

    const lineRows = lines
      .filter(l => l.product_id)
      .map(l => ({
        quote_id: quoteId,
        product_id: Number(l.product_id),
        qty: Number(l.qty) || 0,
        with_install: l.with_install,
        labor_cost: l.with_install ? (Number(l.labor_cost) || 0) : 0,
        line_total: Math.round(lineTotal(l) * 100) / 100,
      }));

    if (lineRows.length > 0) {
      await supabase.from('quote_lines').insert(lineRows);
    }

    setSaving(false);
    alert('ההצעה נשמרה בהצלחה!');
    if (!id) {
      navigate(`/history/${quoteId}`);
    }
  }

  // New quote (reset)
  function resetForm() {
    setProjectName('');
    setClientName('');
    setLines([emptyLine()]);
    setProfitMode('percent');
    setProfitValue('');
    navigate('/');
  }

  function formatCurrency(n) {
    return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 });
  }

  if (!loaded) return <div className="empty">טוען...</div>;

  return (
    <div className="fade-in">
      <div className="header">{id ? 'עריכת הצעה' : 'הצעת מחיר חדשה'}</div>

      {/* Project details */}
      <div className="card">
        <div style={{ marginBottom: 10 }}>
          <label>שם פרויקט</label>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="לדוגמה: מגדל הים"
          />
        </div>
        <div>
          <label>שם לקוח</label>
          <input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="שם החברה / הלקוח"
          />
        </div>
      </div>

      {/* Lines */}
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
        מוצרים
      </div>

      {lines.map((line, i) => {
        const product = productMap[line.product_id];
        const lt = lineTotal(line);
        return (
          <div className="line-card" key={line.key}>
            <div className="line-header">
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>שורה {i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {lt > 0 && <span className="line-total">{formatCurrency(lt)}</span>}
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
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit} – {p.cost_price} ₪)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>כמות {product ? `(${product.unit})` : ''}</label>
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
                <label>&nbsp;</label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={line.with_install}
                    onChange={e => updateLine(i, 'with_install', e.target.checked)}
                  />
                  <span className="toggle-track" />
                  כולל התקנה
                </label>
              </div>

              {line.with_install && (
                <div>
                  <label>עלות עובד ליחידה ₪</label>
                  <input
                    type="number"
                    value={line.labor_cost}
                    onChange={e => updateLine(i, 'labor_cost', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button className="btn btn-primary btn-block" onClick={addLine} style={{ marginBottom: 16 }}>
        + הוסף שורה
      </button>

      {/* Profit */}
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>סוג רווח</label>
            <select value={profitMode} onChange={e => setProfitMode(e.target.value)}>
              <option value="percent">אחוז %</option>
              <option value="fixed">סכום קבוע ₪</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>{profitMode === 'percent' ? 'אחוז רווח' : 'סכום רווח ₪'}</label>
            <input
              type="number"
              value={profitValue}
              onChange={e => setProfitValue(e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="summary">
        <div className="summary-row">
          <span>עלות כוללת</span>
          <span>{formatCurrency(totalCost)}</span>
        </div>
        <div className="summary-row">
          <span>רווח {profitMode === 'percent' && profitValue ? `(${profitValue}%)` : ''}</span>
          <span>{formatCurrency(profitAmount)}</span>
        </div>
        <div className="summary-row total">
          <span>מחיר ללקוח</span>
          <span>{formatCurrency(saleTotal)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-green btn-block"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'שומר...' : id ? 'עדכן הצעה' : 'שמור הצעה'}
        </button>
        {id && (
          <button className="btn btn-primary" onClick={resetForm}>
            הצעה חדשה
          </button>
        )}
      </div>
    </div>
  );
}
