'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const DOC_LABELS = {
    pan_card: '🪪 PAN Card',
    aadhaar_card: '🆔 Aadhaar Card',
    address_proof: '🏠 Address Proof',
    bank_statement: '🏦 Bank Statement',
    passport: '📘 Passport',
    photograph: '📸 Photograph',
    salary_slip: '💰 Salary Slip',
    itr: '📊 ITR',
    signature: '✍️ Signature',
};

export default function CaseDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState(['email']);
    const [sending, setSending] = useState(false);
    const [linkResult, setLinkResult] = useState(null);
    const [toast, setToast] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isReminder, setIsReminder] = useState(false);
    const [sendingReminder, setSendingReminder] = useState(null);

    const fetchCase = async () => {
        try {
            const res = await fetch(`/api/cases/${id}`);
            const data = await res.json();
            if (data.case) setCaseData(data.case);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCase(); }, [id]);

    const toggleChannel = (ch) => {
        setSelectedChannels(prev => {
            if (prev.includes(ch)) {
                // Don't allow deselecting all
                if (prev.length === 1) return prev;
                return prev.filter(c => c !== ch);
            }
            return [...prev, ch];
        });
    };

    const handleSendLink = async (reminder = false) => {
        setSending(true);
        try {
            const res = await fetch(`/api/cases/${id}/send-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channels: selectedChannels,
                    reminder,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setLinkResult(data);
                const channelNames = data.channels.map(c => c.toUpperCase()).join(', ');
                setToast({
                    type: 'success',
                    message: reminder
                        ? `Reminder sent via ${channelNames}! 🔔`
                        : `Link sent via ${channelNames} successfully!`,
                });
                setTimeout(() => setToast(null), 3000);
                fetchCase();
            }
        } catch (err) {
            setToast({ type: 'error', message: 'Failed to send link' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setSending(false);
        }
    };

    const handleSendReminder = async (token) => {
        setSendingReminder(token);
        try {
            const res = await fetch(`/api/cases/${id}/send-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channels: selectedChannels,
                    reminder: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                const channelNames = data.channels.map(c => c.toUpperCase()).join(', ');
                setToast({ type: 'success', message: `🔔 Reminder sent via ${channelNames}!` });
                setTimeout(() => setToast(null), 3000);
                fetchCase();
            }
        } catch {
            setToast({ type: 'error', message: 'Failed to send reminder' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setSendingReminder(null);
        }
    };

    const copyLink = (url) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="loading-container">
                        <div className="spinner spinner-lg"></div>
                        <p>Loading case details...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <h3>Case not found</h3>
                        <p>The case you&apos;re looking for doesn&apos;t exist.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/')}>
                            ← Back to Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const pendingCount = caseData.pendingDocuments.filter(d => d.status === 'pending' || d.status === 'rejected').length;
    const completedCount = caseData.pendingDocuments.filter(d => d.status === 'validated').length;
    const progress = caseData.pendingDocuments.length > 0 ? (completedCount / caseData.pendingDocuments.length) * 100 : 0;
    const hasExistingLinks = caseData.links.length > 0;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <a href="/" className="back-link">← Back to Dashboard</a>

                <div className="page-header">
                    <div>
                        <h1>
                            {caseData.customerName}
                            <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 12 }}>
                                {caseData.loanId}
                            </span>
                        </h1>
                        <p className="subtitle">
                            {caseData.customerType} · {caseData.loanType} · Created{' '}
                            {new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" onClick={fetchCase}>🔄 Refresh</button>
                        {hasExistingLinks && pendingCount > 0 && (
                            <button className="btn btn-secondary" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                                onClick={() => {
                                    setShowSendModal(true);
                                    setLinkResult(null);
                                    setIsReminder(true);
                                }}>
                                🔔 Send Reminder
                            </button>
                        )}
                        <button className="btn btn-primary"
                            onClick={() => {
                                setShowSendModal(true);
                                setLinkResult(null);
                                setIsReminder(false);
                            }}
                            disabled={pendingCount === 0}>
                            🔗 Send Upload Link
                        </button>
                    </div>
                </div>

                {/* Case Summary */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="stat-card purple">
                        <div className="stat-value">{caseData.pendingDocuments.length}</div>
                        <div className="stat-label">Total Documents</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-value">{completedCount}</div>
                        <div className="stat-label">Validated</div>
                    </div>
                    <div className="stat-card yellow">
                        <div className="stat-value">{pendingCount}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-value">{caseData.links.length}</div>
                        <div className="stat-label">Links Sent</div>
                    </div>
                </div>

                {/* Progress */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>Collection Progress</span>
                        <span style={{ color: 'var(--text-muted)' }}>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="grid-2">
                    {/* Document Checklist */}
                    <div className="card">
                        <div className="card-header">
                            <h2>📑 Document Checklist</h2>
                            <span className={`badge ${caseData.status}`}>
                                {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                            </span>
                        </div>

                        <div className="doc-checklist">
                            {caseData.pendingDocuments.map((doc, idx) => (
                                <div className="doc-item" key={idx}>
                                    <div className={`doc-status-icon ${doc.status}`}>
                                        {doc.status === 'pending' && '⏳'}
                                        {doc.status === 'validated' && '✅'}
                                        {doc.status === 'rejected' && '❌'}
                                        {doc.status === 'uploaded' && '📤'}
                                    </div>
                                    <div className="doc-info">
                                        <div className="doc-name">
                                            {DOC_LABELS[doc.docType] || doc.docType}
                                            {doc.validationResult?.source === 'digilocker' && <span className="source-badge digilocker" style={{ marginLeft: 8 }}>🔗 DigiLocker</span>}
                                            {doc.validationResult?.source === 'account_aggregator' && <span className="source-badge account-aggregator" style={{ marginLeft: 8 }}>🏦 Account Aggregator</span>}
                                            {doc.validationResult?.bypassed && <span className="source-badge manual" style={{ marginLeft: 8 }}>📌 Manual Override</span>}
                                        </div>
                                        <div className="doc-detail">
                                            {doc.status === 'pending' && 'Awaiting upload from customer'}
                                            {doc.status === 'validated' && doc.validationResult?.message}
                                            {doc.status === 'rejected' && doc.validationResult?.message}
                                            {doc.status === 'uploaded' && `Uploaded: ${doc.uploadedFile}`}
                                        </div>
                                        {doc.comment && (
                                            <div className="doc-detail" style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--text-accent)' }}>
                                                💬 &quot;{doc.comment}&quot;
                                            </div>
                                        )}
                                    </div>
                                    <span className={`badge ${doc.status}`}>
                                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Customer Info */}
                        <div className="card">
                            <div className="card-header"><h2>👤 Contact Information</h2></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                                    <span style={{ fontWeight: 600 }}>{caseData.customerPhone || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Email</span>
                                    <span style={{ fontWeight: 600 }}>{caseData.customerEmail}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Type</span>
                                    <span className="badge" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)' }}>
                                        {caseData.customerType}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Link History */}
                        <div className="card">
                            <div className="card-header">
                                <h2>🔗 Link History</h2>
                                {hasExistingLinks && pendingCount > 0 && (
                                    <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', fontSize: 12 }}
                                        disabled={sendingReminder}
                                        onClick={() => handleSendReminder()}>
                                        {sendingReminder ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> Sending...</> : '🔔 Send Reminder'}
                                    </button>
                                )}
                            </div>
                            {caseData.links.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No links sent yet</p>
                            ) : (
                                <div className="link-history">
                                    {caseData.links.map((link, idx) => (
                                        <div className="link-entry" key={idx}>
                                            <span className={`link-channel ${link.channel}`}>
                                                {link.channel === 'email' && '📧'}
                                                {link.channel === 'sms' && '💬'}
                                                {link.channel === 'whatsapp' && '💚'}
                                                {' '}{link.channel}
                                            </span>
                                            <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: 12 }}>
                                                {new Date(link.sentAt).toLocaleString('en-IN')}
                                            </span>
                                            <span className="badge completed" style={{ fontSize: 11 }}>Sent</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Remarks */}
                        <div className="card">
                            <div className="card-header"><h2>💬 Remarks</h2></div>
                            {caseData.remarks.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No remarks yet</p>
                            ) : (
                                <div className="remarks-list">
                                    {caseData.remarks.map((remark, idx) => (
                                        <div className="remark-item" key={idx}>
                                            <div className="remark-text">{remark.text}</div>
                                            <div className="remark-meta">
                                                {remark.author} · {new Date(remark.createdAt).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══════ Send Link / Reminder Modal ═══════ */}
                {showSendModal && (
                    <div className="modal-overlay" onClick={() => !sending && setShowSendModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>{isReminder ? '🔔 Send Reminder' : '🔗 Send Upload Link'}</h2>

                            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                                {isReminder
                                    ? <>Re-send the upload link to <strong>{caseData.customerName}</strong> as a reminder. Select one or more channels.</>
                                    : <>Send a document upload link to <strong>{caseData.customerName}</strong>. Select one or more channels.</>
                                }
                            </p>

                            <div className="form-group">
                                <label>Select Channels <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' }}>(click to toggle – select one or more)</span></label>
                                <div className="channel-options">
                                    {[
                                        { id: 'sms', icon: '💬', label: 'SMS', detail: caseData.customerPhone },
                                        { id: 'email', icon: '📧', label: 'Email', detail: caseData.customerEmail },
                                        { id: 'whatsapp', icon: '💚', label: 'WhatsApp', detail: caseData.customerPhone },
                                    ].map((ch) => (
                                        <div key={ch.id}
                                            className={`channel-option ${selectedChannels.includes(ch.id) ? 'selected' : ''}`}
                                            onClick={() => toggleChannel(ch.id)}>
                                            <span className="channel-icon">{ch.icon}</span>
                                            <span className="channel-label">{ch.label}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ch.detail}</span>
                                            {/* Checkbox indicator */}
                                            <div style={{
                                                width: 20, height: 20, borderRadius: 4, marginTop: 4,
                                                border: selectedChannels.includes(ch.id) ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
                                                background: selectedChannels.includes(ch.id) ? 'var(--accent-primary)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: 12, fontWeight: 700,
                                                transition: 'all 0.2s',
                                            }}>
                                                {selectedChannels.includes(ch.id) ? '✓' : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedChannels.length > 1 && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        ✨ Sending via {selectedChannels.length} channels: {selectedChannels.map(c => c.toUpperCase()).join(' + ')}
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', marginTop: 8 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Pending documents to collect:</div>
                                <div style={{ fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {caseData.pendingDocuments
                                        .filter(d => d.status === 'pending' || d.status === 'rejected')
                                        .map((d, i) => (
                                            <span key={i} className="badge pending" style={{ fontSize: 11 }}>
                                                {DOC_LABELS[d.docType]?.replace(/^[^\s]+\s/, '') || d.docType}
                                            </span>
                                        ))}
                                </div>
                            </div>

                            {/* Link Result */}
                            {linkResult && (
                                <div style={{ marginTop: 20 }}>
                                    <div className="validation-result success">
                                        <span className="validation-icon">✅</span>
                                        <div>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                                {isReminder ? 'Reminder sent successfully!' : 'Link sent successfully!'}
                                            </div>
                                            <div style={{ fontSize: 12 }}>
                                                Sent via {linkResult.channels.map(c => c.toUpperCase()).join(', ')}
                                                {linkResult.channels.length > 1 && ` (${linkResult.channels.length} channels)`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="copy-link-box">
                                        <input type="text" readOnly value={linkResult.uploadUrl} />
                                        <button className="btn btn-sm btn-secondary" onClick={() => copyLink(linkResult.uploadUrl)}>
                                            {copied ? '✅ Copied' : '📋 Copy'}
                                        </button>
                                    </div>

                                    {/* Show all notification previews */}
                                    {linkResult.notifications.map((notif, idx) => (
                                        <div className="notification-preview" key={idx} style={{ marginTop: idx > 0 ? 8 : 0 }}>
                                            <div className="notif-header">
                                                {notif.channel === 'email' && '📧'}
                                                {notif.channel === 'sms' && '💬'}
                                                {notif.channel === 'whatsapp' && '💚'}
                                                {' '}{notif.channel.toUpperCase()} Preview — {notif.recipient}
                                            </div>
                                            <div className="notif-body">{notif.message}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowSendModal(false)} disabled={sending}>
                                    {linkResult ? 'Close' : 'Cancel'}
                                </button>
                                {!linkResult && (
                                    <button className="btn btn-primary" onClick={() => handleSendLink(isReminder)} disabled={sending || selectedChannels.length === 0}
                                        style={isReminder ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}>
                                        {sending ? (
                                            <><div className="spinner" style={{ width: 16, height: 16 }}></div> Sending...</>
                                        ) : (
                                            isReminder
                                                ? `🔔 Send Reminder via ${selectedChannels.length > 1 ? selectedChannels.length + ' channels' : selectedChannels[0]?.toUpperCase()}`
                                                : `Send via ${selectedChannels.length > 1 ? selectedChannels.length + ' channels' : selectedChannels[0]?.toUpperCase()}`
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {toast && (
                    <div className={`toast ${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                )}
            </main>
        </div>
    );
}
