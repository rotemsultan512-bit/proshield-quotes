import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function History() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchQuotes(); }, []);

  async function fetchQuotes() {
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }

  async function deleteQuote(e, id) {
    e.stopPropagation();
    if (!confirm('למחוק הצעה זו?')) return;
    await supabase.from('quotes').delete().eq('id', id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatCurrency(n) {
    return Number(n).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
  }

  return (
    <div className="fade-in">
      <div className="header">היסטוריית הצעות</div>

      {loading ? (
        <div className="empty">טוען...</div>
      ) : quotes.length === 0 ? (
        <div className="empty">אין הצעות מחיר שמורות</div>
      ) : (
        quotes.map(q => {
          const cost = Number(q.total_cost) || 0;
          const client = Number(q.client_total || q.sale_total) || 0;
          const profit = client - cost;
          return (
            <div
              className="history-item"
              key={q.id}
              onClick={() => navigate(`/history/${q.id}`)}
            >
              <div style={{ flex: 1 }}>
                <div className="title">{q.project_name}</div>
                <div className="meta">{q.client_name} · {formatDate(q.created_at)}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>עלות: {formatCurrency(cost)}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ללקוח: {formatCurrency(client)}</span>
                  <span style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    רווח: {formatCurrency(profit)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn btn-red btn-sm"
                  onClick={e => deleteQuote(e, q.id)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
