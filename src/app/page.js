'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

const DOC_LABELS = {
  pan_card: 'PAN Card',
  aadhaar_card: 'Aadhaar Card',
  address_proof: 'Address Proof',
  bank_statement: 'Bank Statement',
  passport: 'Passport',
  photograph: 'Photograph',
  salary_slip: 'Salary Slip',
  itr: 'ITR',
  signature: 'Signature',
};

export default function Dashboard() {
  const [data, setData] = useState({ cases: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/cases');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCases = data.cases.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.loanId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateTAT = (c) => {
    const start = new Date(c.createdAt);
    const end = c.completedAt ? new Date(c.completedAt) : new Date();
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${diffHours}h ${diffMins}m`;
  };

  const stats = data.stats;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Document Pendency Dashboard</h1>
            <p className="subtitle">Aditya Birla Capital · Manage document collection across all loan cases</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={fetchData}>
              🔄 Refresh
            </button>
            <Link href="/cases/new" className="btn btn-primary">
              ➕ New Case
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">Total Cases</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{(stats.pending || 0) + (stats.partial || 0)}</div>
            <div className="stat-label">Pending Cases</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.completed || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon">📄</div>
            <div className="stat-value">
              {stats.collectedDocs || 0}/{stats.totalDocs || 0}
            </div>
            <div className="stat-label">Docs Collected</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{stats.rejected || 0}</div>
            <div className="stat-label">Issues</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍  Search by customer name or loan ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 400 }}
            />
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ maxWidth: 200 }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
              <option value="rejected">Issues</option>
            </select>
          </div>
        </div>

        {/* Cases Table */}
        <div className="card">
          <div className="card-header">
            <h2>Cases ({filteredCases.length})</h2>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner spinner-lg"></div>
              <p>Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No cases found</h3>
              <p>Create a new case to get started</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Loan Type</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id} onClick={() => (window.location.href = `/cases/${c.id}`)}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-accent)' }}>
                      {c.loanId}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.customerName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.customerEmail}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: c.customerType === 'DSA' ? 'var(--accent-info-bg)' : 'var(--bg-glass-hover)', color: c.customerType === 'DSA' ? 'var(--accent-info)' : 'var(--text-secondary)' }}>
                        {c.customerType}
                      </span>
                    </td>
                    <td>{c.loanType}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>
                          {c.completedDocs}/{c.totalDocs}
                        </span>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${c.totalDocs > 0 ? (c.completedDocs / c.totalDocs) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.status}`}>
                        {c.status === 'pending' && '⏳'}
                        {c.status === 'partial' && '🔄'}
                        {c.status === 'completed' && '✅'}
                        {c.status === 'rejected' && '❌'}
                        {' '}
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <div style={{ fontSize: 11 }}>
                        {new Date(c.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4, padding: '2px 4px', background: 'var(--bg-subtle)', borderRadius: 4, display: 'inline-block' }}>
                        ⏱️ TAT: {calculateTAT(c)}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/cases/${c.id}`}
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
