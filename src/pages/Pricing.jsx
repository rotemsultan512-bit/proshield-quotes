import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UNITS = ['מ"ר', 'מ"א', 'יח\''];

export default function Pricing() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('id');
    setProducts(data || []);
    setLoading(false);
  }

  async function updateProduct(id, field, value) {
    setSaving(id);
    const update = { [field]: field === 'cost_price' ? Number(value) : value };
    await supabase.from('products').update(update).eq('id', id);
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...update } : p))
    );
    setSaving(null);
  }

  async function addProduct() {
    const { data } = await supabase
      .from('products')
      .insert({ name: 'מוצר חדש', unit: 'מ"א', cost_price: 0 })
      .select()
      .single();
    if (data) setProducts(prev => [...prev, data]);
  }

  async function deleteProduct(id) {
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="fade-in">
      <div className="header">מחירון מוצרים</div>

      {loading ? (
        <div className="empty">טוען...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 340 }}>
              {/* Header */}
              <div className="product-row" style={{ fontWeight: 600, color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>
                <span className="name">מוצר</span>
                <span style={{ width: 60, textAlign: 'center' }}>יחידה</span>
                <span style={{ width: 80, textAlign: 'center' }}>עלות ₪</span>
                <span style={{ width: 36 }}></span>
              </div>

              {products.map(p => (
                <div className="product-row" key={p.id}>
                  <input
                    className="name"
                    value={p.name}
                    onChange={e => updateProduct(p.id, 'name', e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text)', flex: 1, padding: '4px 0' }}
                  />
                  <select
                    className="unit-select"
                    value={p.unit}
                    onChange={e => updateProduct(p.id, 'unit', e.target.value)}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    type="number"
                    value={p.cost_price}
                    onChange={e => updateProduct(p.id, 'cost_price', e.target.value)}
                    style={{ width: 80, textAlign: 'center' }}
                    step="0.01"
                  />
                  <button
                    className="btn btn-red btn-sm"
                    style={{ width: 36, padding: 4, fontSize: '1rem' }}
                    onClick={() => deleteProduct(p.id)}
                    title="מחק"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={addProduct}
            style={{ marginTop: 16 }}
          >
            + הוסף מוצר
          </button>
        </>
      )}
    </div>
  );
}
