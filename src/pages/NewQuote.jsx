import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const emptyLine = () => ({
  key: Date.now() + Math.random(),
  product_id: '',
  qty: '',
  with_install: false,
  labor_cost: '',
  client_price: '',
});

export default function NewQuote() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
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
      setLines(
        (qLines || []).map(l => ({
          key: l.id,
          product_id: String(l.product_id),
          qty: String(l.qty),
          with_install: l.with_install,
          labor_cost: String(l.labor_cost || ''),
          client_price: String(l.client_price || ''),
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

  // Calculate line cost (my cost)
  function lineCost(line) {
    const product = productMap[line.product_id];
    if (!product) return 0;
    const qty = Number(line.qty) || 0;
    const material = product.cost_price;
    const labor = line.with_install ? (Number(line.labor_cost) || 0) : 0;
    return (material + labor) * qty;
  }

  // Calculate line client total
  function lineClientTotal(line) {
    const qty = Number(line.qty) || 0;
    const cp = Number(line.client_price) || 0;
    return cp * qty;
  }

  // Totals
  const totalMaterial = useMemo(
    () => lines.reduce((sum, l) => {
      const product = productMap[l.product_id];
      if (!product) return sum;
      return sum + product.cost_price * (Number(l.qty) || 0);
    }, 0),
    [lines, productMap]
  );

  const totalLabor = useMemo(
    () => lines.reduce((sum, l) => {
      if (!l.with_install) return sum;
      return sum + (Number(l.labor_cost) || 0) * (Number(l.qty) || 0);
    }, 0),
    [lines]
  );

  const totalCost = totalMaterial + totalLabor;

  const clientTotal = useMemo(
    () => lines.reduce((sum, l) => sum + lineClientTotal(l), 0),
    [lines]
  );

  const profit = clientTotal - totalCost;

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
      profit_mode: 'fixed',
      profit_value: Math.round(profit * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      sale_total: Math.round(clientTotal * 100) / 100,
      client_total: Math.round(clientTotal * 100) / 100,
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
        client_price: Number(l.client_price) || 0,
        line_total: Math.round(lineCost(l) * 100) / 100,
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
        const myCost = lineCost(line);
        const clientLine = lineClientTotal(line);
        return (
          <div className="line-card" key={line.key}>
            <div className="line-header">
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>שורה {i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {myCost > 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    עלות: {formatCurrency(myCost)}
                  </span>
                )}
                {clientLine > 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                    ללקוח: {formatCurrency(clientLine)}
                  </span>
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
                <label>מחיר ללקוח ליח׳ ₪</label>
                <input
                  type="number"
                  value={line.client_price}
                  onChange={e => updateLine(i, 'client_price', e.target.value)}
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
                  <label>עלות עובד למטר ₪</label>
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

      {/* Summary */}
      <div className="summary">
        <div className="summary-row">
          <span>עלות חומר</span>
          <span>{formatCurrency(totalMaterial)}</span>
        </div>
        {totalLabor > 0 && (
          <div className="summary-row">
            <span>עלות עובדים</span>
            <span>{formatCurrency(totalLabor)}</span>
          </div>
        )}
        <div className="summary-row" style={{ fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
          <span>עלות כוללת שלי</span>
          <span>{formatCurrency(totalCost)}</span>
        </div>
        <div className="summary-row client-total" style={{ marginTop: 8 }}>
          <span>סה״כ ללקוח</span>
          <span>{formatCurrency(clientTotal)}</span>
        </div>
        <div className={`summary-row total ${profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
          <span>רווח</span>
          <span>{formatCurrency(profit)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-primary btn-block"
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
