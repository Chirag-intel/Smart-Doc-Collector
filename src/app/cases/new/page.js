'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const DOCUMENT_TYPES = [
    { id: 'pan_card', label: 'PAN Card', icon: '🪪' },
    { id: 'aadhaar_card', label: 'Aadhaar Card', icon: '🆔' },
    { id: 'address_proof', label: 'Address Proof', icon: '🏠' },
    { id: 'bank_statement', label: 'Bank Statement', icon: '🏦' },
    { id: 'passport', label: 'Passport', icon: '📘' },
    { id: 'photograph', label: 'Photograph', icon: '📸' },
    { id: 'salary_slip', label: 'Salary Slip', icon: '💰' },
    { id: 'itr', label: 'ITR', icon: '📊' },
    { id: 'signature', label: 'Signature', icon: '✍️' },
];

const LOAN_TYPES = ['Personal Loan', 'Home Loan', 'Vehicle Loan', 'Business Loan', 'Education Loan', 'Gold Loan'];

export default function NewCasePage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [form, setForm] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerType: 'Customer',
        loanType: 'Personal Loan',
        loanId: '',
        pendingDocuments: [],
    });

    const toggleDoc = (docId) => {
        setForm(prev => {
            const exists = prev.pendingDocuments.find(d => !d.isOther && d.docType === docId);
            if (exists) {
                return { ...prev, pendingDocuments: prev.pendingDocuments.filter(d => d !== exists) };
            }
            const docDef = DOCUMENT_TYPES.find(d => d.id === docId);
            return {
                ...prev,
                pendingDocuments: [
                    ...prev.pendingDocuments,
                    { id: Date.now() + Math.random(), docType: docId, isOther: false, label: docDef.label, adminComment: '' }
                ]
            };
        });
    };

    const addOtherDoc = () => {
        setForm(prev => ({
            ...prev,
            pendingDocuments: [
                ...prev.pendingDocuments,
                { id: Date.now() + Math.random(), docType: 'other', isOther: true, label: '', adminComment: '' }
            ]
        }));
    };

    const updateDoc = (id, field, value) => {
        setForm(prev => ({
            ...prev,
            pendingDocuments: prev.pendingDocuments.map(d => d.id === id ? { ...d, [field]: value } : d)
        }));
    };

    const removeDoc = (id) => {
        setForm(prev => ({ ...prev, pendingDocuments: prev.pendingDocuments.filter(d => d.id !== id) }));
    };

    const handleSubmit = async (e, actionType) => {
        e.preventDefault();

        // Mobile is mandatory
        if (!form.customerName || !form.customerPhone || form.pendingDocuments.length === 0) {
            setToast({ type: 'error', message: 'Please fill all required fields and select at least one document' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        // Validate 'other' docs
        if (form.pendingDocuments.some(d => d.isOther && !d.label)) {
            setToast({ type: 'error', message: 'Please provide a name for all "Other" documents' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    loanId: form.loanId || `LN-${Date.now().toString().slice(-6)}`,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', message: 'Case created successfully!' });
                const url = actionType === 'create_and_send' ? `/cases/${data.case.id}?send_link=1` : `/cases/${data.case.id}`;
                setTimeout(() => router.push(url), 1000);
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            setToast({ type: 'error', message: 'Failed to create case: ' + err.message });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <a href="/" className="back-link">← Back to Dashboard</a>

                <div className="page-header">
                    <div>
                        <h1>Create New Pendency Case</h1>
                        <p className="subtitle">Set up a document collection request for a customer or DSA</p>
                    </div>
                </div>

                <form>
                    <div className="grid-2">
                        {/* Customer Info */}
                        <div className="card">
                            <div className="card-header">
                                <h2>👤 Customer / DSA Information</h2>
                            </div>

                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter full name"
                                    value={form.customerName}
                                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number *</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="+91 XXXXX XXXXX"
                                    value={form.customerPhone}
                                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="customer@email.com"
                                    value={form.customerEmail}
                                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                                />
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        className="form-select"
                                        value={form.customerType}
                                        onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                                    >
                                        <option value="Customer">Customer</option>
                                        <option value="DSA">DSA</option>
                                        <option value="Connector">Connector</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Loan Type</label>
                                    <select
                                        className="form-select"
                                        value={form.loanType}
                                        onChange={(e) => setForm({ ...form, loanType: e.target.value })}
                                    >
                                        {LOAN_TYPES.map((lt) => (
                                            <option key={lt} value={lt}>{lt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Loan ID (auto-generated if left blank)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="PL-2026-XXXXX"
                                    value={form.loanId}
                                    onChange={(e) => setForm({ ...form, loanId: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Document Selection */}
                        <div className="card">
                            <div className="card-header">
                                <h2>📑 Select Pending Documents</h2>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    {form.pendingDocuments.length} selected
                                </span>
                            </div>

                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                Choose the documents that the customer/DSA needs to submit:
                            </p>

                            <div className="doc-chips">
                                {DOCUMENT_TYPES.map((doc) => {
                                    const isSelected = form.pendingDocuments.some(d => !d.isOther && d.docType === doc.id);
                                    return (
                                        <div
                                            key={doc.id}
                                            className={`doc-chip ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleDoc(doc.id)}
                                        >
                                            <span className="chip-check">
                                                {isSelected ? '✓' : ''}
                                            </span>
                                            <span>{doc.icon}</span>
                                            <span>{doc.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={addOtherDoc}
                                >
                                    ➕ Add Other Document
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setForm({ ...form, pendingDocuments: [] })}
                                >
                                    Clear All
                                </button>
                            </div>

                            {form.pendingDocuments.length > 0 && (
                                <div style={{ marginTop: 24, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                                    <h3 style={{ fontSize: 14, marginBottom: 12 }}>Selected Documents ({form.pendingDocuments.length})</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {form.pendingDocuments.map(doc => (
                                            <div key={doc.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: 12, borderRadius: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    {doc.isOther ? (
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            placeholder="Document Name (e.g. Company Letter) *"
                                                            style={{ padding: '4px 8px', fontSize: 13 }}
                                                            value={doc.label}
                                                            onChange={e => updateDoc(doc.id, 'label', e.target.value)}
                                                        />
                                                    ) : (
                                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{doc.label}</span>
                                                    )}
                                                    <button type="button" onClick={() => removeDoc(doc.id)} style={{ color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                                                </div>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Add a comment or specific requirement for this document (Optional)..."
                                                    style={{ width: '100%', fontSize: 13 }}
                                                    value={doc.adminComment}
                                                    onChange={e => updateDoc(doc.id, 'adminComment', e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Submit */}
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button type="button" className="btn btn-secondary btn-lg" onClick={() => router.push('/')}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-secondary btn-lg" onClick={(e) => handleSubmit(e, 'create_only')} disabled={submitting}>
                            💾 Save Case Only
                        </button>
                        <button type="button" className="btn btn-primary btn-lg" onClick={(e) => handleSubmit(e, 'create_and_send')} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                    Processing...
                                </>
                            ) : (
                                '✨ Create Case & Send Link'
                            )}
                        </button>
                    </div>
                </form>

                {toast && (
                    <div className={`toast ${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                )}
            </main>
        </div>
    );
}
