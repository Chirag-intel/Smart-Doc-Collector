'use client';
import { useState, useEffect, useRef, useCallback, use } from 'react';

const DOC_LABELS = {
    pan_card: 'PAN Card', aadhaar_card: 'Aadhaar Card', address_proof: 'Address Proof',
    bank_statement: 'Bank Statement', passport: 'Passport', photograph: 'Photograph',
    salary_slip: 'Salary Slip', itr: 'ITR', signature: 'Signature',
};

const DIGILOCKER_DOCS = ['pan_card', 'aadhaar_card'];
const AA_DOCS = ['bank_statement'];

const BANKS = [
    { id: 'sbi', name: 'SBI', icon: '🏛️' },
    { id: 'hdfc', name: 'HDFC Bank', icon: '🔵' },
    { id: 'icici', name: 'ICICI Bank', icon: '🟠' },
    { id: 'axis', name: 'Axis Bank', icon: '🟣' },
    { id: 'kotak', name: 'Kotak', icon: '🔴' },
    { id: 'pnb', name: 'PNB', icon: '🟤' },
];

export default function UploadPortalPage({ params }) {
    const { token } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploads, setUploads] = useState({});
    const [validations, setValidations] = useState({});
    const [comments, setComments] = useState({});
    const [uploading, setUploading] = useState({});
    const [allSubmitted, setAllSubmitted] = useState(false);
    const [toast, setToast] = useState(null);
    const [bypassRemarks, setBypassRemarks] = useState({});
    const [showBypass, setShowBypass] = useState({});
    const [bypassing, setBypassing] = useState({});

    // DigiLocker modal state — no longer tied to a single docType
    const [digiModal, setDigiModal] = useState({ open: false, step: 1 });
    const [digiPhone, setDigiPhone] = useState('');
    const [digiOtp, setDigiOtp] = useState(['', '', '', '', '', '']);
    const [digiConsent, setDigiConsent] = useState({});
    const [digiProcessing, setDigiProcessing] = useState(false);

    // ABC Assist Voice Bot state
    const [botExpanded, setBotExpanded] = useState(false);
    const [botVisible, setBotVisible] = useState(true);
    const [botLang, setBotLang] = useState('en');
    const [botPlaying, setBotPlaying] = useState(false);
    const [botLangOpen, setBotLangOpen] = useState(false);
    const [botCurrentMsg, setBotCurrentMsg] = useState('');
    const synthRef = useRef(null);
    const botTimerRef = useRef(null);

    // Account Aggregator modal state
    const [aaModal, setAaModal] = useState({ open: false, docType: null, step: 1 });
    const [aaBank, setAaBank] = useState(null);
    const [aaUserId, setAaUserId] = useState('');
    const [aaPassword, setAaPassword] = useState('');
    const [aaConsent, setAaConsent] = useState(false);
    const [aaProcessing, setAaProcessing] = useState(false);

    useEffect(() => { fetchData(); }, [token]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/upload/${token}`);
            if (!res.ok) throw new Error('Invalid or expired link');
            setData(await res.json());
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleFileSelect = async (docType, file, docLabel) => {
        if (!file) return;
        setUploading(p => ({ ...p, [docType]: true }));
        setUploads(p => ({ ...p, [docType]: file }));
        try {
            const formData = new FormData();
            formData.append('docType', docType);
            formData.append('file', file);
            formData.append('comment', comments[docType] || '');
            formData.append('source', 'manual');
            const res = await fetch(`/api/upload/${token}`, { method: 'POST', body: formData });
            const result = await res.json();
            setValidations(p => ({ ...p, [docType]: result.validation }));
            const label = docLabel || DOC_LABELS[docType] || 'Document';
            if (result.validation.valid) showToast('success', `${label} verified successfully!`);
            else showToast('error', `${label} validation failed. ${result.validation.message}`);
        } catch { showToast('error', 'Upload failed.'); }
        finally { setUploading(p => ({ ...p, [docType]: false })); }
    };

    const handleDrop = (e, docType, docLabel) => { e.preventDefault(); handleFileSelect(docType, e.dataTransfer.files[0], docLabel); };
    const handleDragOver = (e) => e.preventDefault();

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBypassSubmit = async (docType, previousFileName, docLabel) => {
        const remark = bypassRemarks[docType]?.trim();
        if (!remark) { showToast('error', 'Please enter a remark.'); return; }
        setBypassing(p => ({ ...p, [docType]: true }));
        try {
            const file = uploads[docType];
            const fileToSend = file || new File(['bypass'], previousFileName || `${docType}_bypass.jpg`, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('docType', docType);
            formData.append('file', fileToSend);
            formData.append('comment', comments[docType] || '');
            formData.append('bypass', 'true');
            formData.append('bypassRemark', remark);
            const res = await fetch(`/api/upload/${token}`, { method: 'POST', body: formData });
            const result = await res.json();
            setValidations(p => ({ ...p, [docType]: { ...result.validation, valid: true, bypassed: true } }));
            setShowBypass(p => ({ ...p, [docType]: false }));
            const label = docLabel || DOC_LABELS[docType] || 'Document';
            showToast('success', `${label} submitted with remark. Accepted!`);
        } catch { showToast('error', 'Bypass submission failed.'); }
        finally { setBypassing(p => ({ ...p, [docType]: false })); }
    };

    // ─── DigiLocker Flow (multi-doc) ───
    const getPendingDigiDocs = () => {
        if (!data) return [];
        return data.documents.filter(d => DIGILOCKER_DOCS.includes(d.docType) && !isDocComplete(d));
    };

    const openDigiLocker = () => {
        const pending = getPendingDigiDocs();
        const consent = {};
        pending.forEach(d => {
            if (d.docType === 'aadhaar_card') consent.aadhaar = true;
            if (d.docType === 'pan_card') consent.pan = true;
        });
        setDigiModal({ open: true, step: 1 });
        setDigiPhone('');
        setDigiOtp(['', '', '', '', '', '']);
        setDigiConsent(consent);
        setDigiProcessing(false);
    };

    const handleDigiOtpChange = (idx, value) => {
        if (value.length > 1) return;
        const newOtp = [...digiOtp];
        newOtp[idx] = value;
        setDigiOtp(newOtp);
        if (value && idx < 5) {
            const next = document.getElementById(`otp-${idx + 1}`);
            if (next) next.focus();
        }
    };

    const submitDigiLocker = async () => {
        setDigiProcessing(true);
        await new Promise(r => setTimeout(r, 2000));
        try {
            const pending = getPendingDigiDocs();
            const docsToFetch = pending.filter(d =>
                (d.docType === 'aadhaar_card' && digiConsent.aadhaar) ||
                (d.docType === 'pan_card' && digiConsent.pan)
            );

            // Upload each selected document
            for (const doc of docsToFetch) {
                const docKey = doc.id || doc.docType;
                const formData = new FormData();
                formData.append('docType', docKey);
                formData.append('file', new File(['digilocker-verified'], `${doc.docType}_digilocker.pdf`, { type: 'application/pdf' }));
                formData.append('source', 'digilocker');
                formData.append('comment', 'Fetched via DigiLocker');
                const res = await fetch(`/api/upload/${token}`, { method: 'POST', body: formData });
                const result = await res.json();
                setValidations(p => ({ ...p, [docKey]: result.validation }));
            }

            const names = docsToFetch.map(d => DOC_LABELS[d.docType]).join(' & ');
            showToast('success', `${names} fetched via DigiLocker! ✅`);
            setDigiModal({ open: false, step: 1 });
            fetchData();
        } catch { showToast('error', 'DigiLocker fetch failed.'); }
        finally { setDigiProcessing(false); }
    };

    // ─── Account Aggregator Flow ───
    const openAA = (docType) => {
        setAaModal({ open: true, docType, step: 1 });
        setAaBank(null);
        setAaUserId('');
        setAaPassword('');
        setAaConsent(false);
        setAaProcessing(false);
    };

    const submitAA = async () => {
        setAaProcessing(true);
        await new Promise(r => setTimeout(r, 2500));
        try {
            const formData = new FormData();
            formData.append('docType', aaModal.docType);
            formData.append('file', new File(['aa-verified'], `${aaModal.docType}_aa.pdf`, { type: 'application/pdf' }));
            formData.append('source', 'account_aggregator');
            formData.append('comment', `Fetched via Account Aggregator (${aaBank})`);
            const res = await fetch(`/api/upload/${token}`, { method: 'POST', body: formData });
            const result = await res.json();
            setValidations(p => ({ ...p, [aaModal.docType]: result.validation }));
            showToast('success', `${DOC_LABELS[aaModal.docType]} fetched via Account Aggregator! ✅`);
            setAaModal({ open: false, docType: null, step: 1 });
            fetchData();
        } catch { showToast('error', 'Account Aggregator fetch failed.'); }
        finally { setAaProcessing(false); }
    };

    const handleSubmitAll = async () => {
        showToast('success', 'All documents submitted successfully! 🎉');
        setAllSubmitted(true);
    };

    // ─── Render Helpers (must be above bot & digilocker logic) ───
    const isDocComplete = (doc) => {
        const docKey = doc.id || doc.docType;
        return validations[docKey]?.valid || doc.status === 'validated' || doc.status === 'uploaded';
    };

    const canSubmitAll = () => {
        if (!data) return false;
        return data.documents.every(d => isDocComplete(d));
    };

    const getSourceBadge = (doc) => {
        const docKey = doc.id || doc.docType;
        const vr = validations[docKey] || doc.validationResult;
        if (!vr) return null;
        if (vr.source === 'digilocker') return <span className="source-badge digilocker">🔗 DigiLocker</span>;
        if (vr.source === 'account_aggregator') return <span className="source-badge account-aggregator">🏦 Account Aggregator</span>;
        if (vr.bypassed) return <span className="source-badge manual">📌 Manual Override</span>;
        return null;
    };

    // ─── ABC Assist Voice Bot ───
    const BOT_MESSAGES = {
        en: {
            welcome: `Hello! I am ABC Assist, your document upload guide. I will help you upload your documents step by step. Let's get started!`,
            docPending: (names) => `You have ${names.length} document${names.length > 1 ? 's' : ''} pending: ${names.join(', ')}. Please upload or fetch each document to continue.`,
            digilockerTip: `Tip: If you have a DigiLocker account, you can fetch your PAN Card and Aadhaar Card directly from DigiLocker in one go. Just click on Fetch via DigiLocker.`,
            aaTip: `For your Bank Statement, you can use the Account Aggregator option to fetch it directly from your bank. Click on Fetch via Account Aggregator.`,
            allDone: `Congratulations! All your documents have been verified. You can now click Submit All Documents to complete the process.`,
            uploadHint: (name) => `To upload your ${name}, click on the upload area or drag and drop your file. We accept JPG, PNG, and PDF files.`,
        },
        hi: {
            welcome: `नमस्ते! मैं ABC Assist हूँ, आपका डॉक्यूमेंट अपलोड गाइड। मैं आपको स्टेप बाय स्टेप डॉक्यूमेंट अपलोड करने में मदद करूँगा। चलिए शुरू करते हैं!`,
            docPending: (names) => `आपके ${names.length} डॉक्यूमेंट पेंडिंग हैं: ${names.join(', ')}। कृपया आगे बढ़ने के लिए प्रत्येक डॉक्यूमेंट अपलोड या फ़ेच करें।`,
            digilockerTip: `टिप: अगर आपके पास DigiLocker अकाउंट है, तो आप अपना PAN Card और Aadhaar Card एक ही बार में DigiLocker से ला सकते हैं। बस Fetch via DigiLocker पर क्लिक करें।`,
            aaTip: `अपने Bank Statement के लिए, आप Account Aggregator विकल्प का उपयोग करके इसे सीधे अपने बैंक से ला सकते हैं।`,
            allDone: `बधाई हो! आपके सभी डॉक्यूमेंट वेरिफाई हो गए हैं। अब आप Submit All Documents पर क्लिक करके प्रक्रिया पूरी कर सकते हैं।`,
            uploadHint: (name) => `अपना ${name} अपलोड करने के लिए, अपलोड एरिया पर क्लिक करें या फ़ाइल ड्रैग और ड्रॉप करें। हम JPG, PNG, और PDF फ़ाइलें स्वीकार करते हैं।`,
        },
    };

    const getBotGuidance = useCallback(() => {
        if (!data) return [];
        const msgs = BOT_MESSAGES[botLang];
        const result = [msgs.welcome];
        const pendingDocs = data.documents.filter(d => !isDocComplete(d));
        if (pendingDocs.length === 0) {
            result.push(msgs.allDone);
        } else {
            const names = pendingDocs.map(d => DOC_LABELS[d.docType]);
            result.push(msgs.docPending(names));
            const hasDigiPending = pendingDocs.some(d => DIGILOCKER_DOCS.includes(d.docType));
            const hasAAPending = pendingDocs.some(d => AA_DOCS.includes(d.docType));
            if (hasDigiPending) result.push(msgs.digilockerTip);
            if (hasAAPending) result.push(msgs.aaTip);
        }
        return result;
    }, [data, botLang, validations]);

    const botSpeak = useCallback((text) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = botLang === 'hi' ? 'hi-IN' : 'en-IN';

        // Find best Indian English / Hindi voice available
        const voices = window.speechSynthesis.getVoices();
        let voice;
        if (botLang === 'hi') {
            voice = voices.find(v => v.lang === 'hi-IN' && (v.name.includes('Lekha') || v.name.includes('Google'))) || voices.find(v => v.lang.startsWith('hi'));
        } else {
            voice = voices.find(v => v.lang === 'en-IN' && (v.name.includes('Veena') || v.name.includes('Rishi') || v.name.includes('Google') || v.name.includes('Indian'))) || voices.find(v => v.lang === 'en-IN');
        }
        if (voice) {
            utter.voice = voice;
        }

        utter.rate = 0.95;
        utter.pitch = 1.0;
        utter.onend = () => setBotPlaying(false);
        utter.onerror = () => setBotPlaying(false);
        synthRef.current = utter;
        setBotPlaying(true);
        setBotCurrentMsg(text);
        window.speechSynthesis.speak(utter);
    }, [botLang]);

    const botPlayAll = useCallback(() => {
        const msgs = getBotGuidance();
        if (msgs.length === 0) return;
        let idx = 0;
        const playNext = () => {
            if (idx >= msgs.length) { setBotPlaying(false); return; }
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(msgs[idx]);
            utter.lang = botLang === 'hi' ? 'hi-IN' : 'en-IN';
            utter.rate = 0.95;
            setBotPlaying(true);
            setBotCurrentMsg(msgs[idx]);
            utter.onend = () => { idx++; setTimeout(playNext, 400); };
            utter.onerror = () => setBotPlaying(false);
            synthRef.current = utter;
            window.speechSynthesis.speak(utter);
        };
        playNext();
    }, [getBotGuidance, botLang]);

    const botPause = () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setBotPlaying(false);
        }
    };

    const botReplay = () => { botPlayAll(); };

    const botClose = () => {
        botPause();
        setBotVisible(false);
    };

    // Auto-play welcome on first expand
    useEffect(() => {
        if (botExpanded && data && typeof window !== 'undefined') {
            botTimerRef.current = setTimeout(() => botPlayAll(), 800);
            return () => clearTimeout(botTimerRef.current);
        }
    }, [botExpanded]);


    if (loading) return (
        <div className="upload-portal">
            <div style={{ textAlign: 'center', padding: 60 }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }}></div>
                <div style={{ color: 'var(--text-muted)' }}>Loading your documents...</div>
            </div>
        </div>
    );

    if (error) return (
        <div className="upload-portal">
            <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <h2 style={{ marginBottom: 8 }}>Link Expired or Invalid</h2>
                <p style={{ color: 'var(--text-muted)' }}>This upload link is no longer active. Please contact your loan officer for a new link.</p>
            </div>
        </div>
    );

    if (allSubmitted) return (
        <div className="upload-portal">
            <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <h2 style={{ marginBottom: 8 }}>Documents Submitted!</h2>
                <p style={{ color: 'var(--text-muted)' }}>All documents have been uploaded and verified. Your loan officer will review them shortly.</p>
            </div>
        </div>
    );

    const completedDocs = data.documents.filter(d => isDocComplete(d)).length;
    const totalDocs = data.documents.length;

    return (
        <div className="upload-portal">
            {/* Header */}
            <div className="portal-header">
                <div className="portal-logo">T</div>
                <h1>Upload Your Documents</h1>
                <p>Securely upload the required documents for your loan application</p>
            </div>

            {/* ABC Assist Voice Bot */}
            {botVisible && (
                <div className={`abc-assist-bar ${botExpanded ? 'expanded' : 'collapsed'}`}>
                    {!botExpanded ? (
                        <div className="abc-collapsed" onClick={() => setBotExpanded(true)}>
                            <button className="abc-close-btn" onClick={(e) => { e.stopPropagation(); botClose(); }}>✕</button>
                            <div className="abc-collapsed-text">
                                <span className="abc-wave">Hey 👋🏻</span> <strong>I am ABC Assist</strong>
                                <br /><span className="abc-sub">Click me to get started!</span>
                            </div>
                            <div className="abc-bot-icon">🤖</div>
                        </div>
                    ) : (
                        <div className="abc-expanded">
                            <button className="abc-close-btn" onClick={botClose}>✕</button>
                            <div className="abc-lang-selector">
                                <button className="abc-lang-btn" onClick={() => setBotLangOpen(!botLangOpen)}>
                                    🌐 {botLang === 'en' ? 'English' : 'हिंदी'} ▾
                                </button>
                                {botLangOpen && (
                                    <div className="abc-lang-dropdown">
                                        <div className={botLang === 'hi' ? 'active' : ''} onClick={() => { setBotLang('hi'); setBotLangOpen(false); botPause(); }}>हिंदी</div>
                                        <div className={botLang === 'en' ? 'active' : ''} onClick={() => { setBotLang('en'); setBotLangOpen(false); botPause(); }}>English</div>
                                    </div>
                                )}
                            </div>
                            <div className="abc-controls">
                                {botPlaying ? (
                                    <button className="abc-ctrl-btn" onClick={botPause}>⏸ Pause</button>
                                ) : (
                                    <button className="abc-ctrl-btn" onClick={botPlayAll}>▶ Play</button>
                                )}
                                <button className="abc-ctrl-btn" onClick={botReplay}>🔄 Replay</button>
                            </div>
                            {botCurrentMsg && (
                                <div className="abc-transcript">
                                    <span className="abc-transcript-icon">{botPlaying ? '🔊' : '💬'}</span>
                                    <span className="abc-transcript-text">{botCurrentMsg.substring(0, 80)}{botCurrentMsg.length > 80 ? '...' : ''}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Customer Info Card */}
            <div className="portal-card card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Applicant</div>
                        <div style={{ fontWeight: 600 }}>{data.customerName}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Loan Type</div>
                        <div style={{ fontWeight: 600 }}>{data.loanType}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Loan ID</div>
                        <div style={{ fontWeight: 600 }}>{data.loanId}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Progress</div>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{completedDocs} / {totalDocs} docs</div>
                    </div>
                </div>
                <div style={{ marginTop: 16, height: 6, background: 'var(--bg-glass)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
            </div>

            {/* Document Cards */}
            {data.documents.map((doc, idx) => {
                const complete = isDocComplete(doc);
                const hasDigiLocker = DIGILOCKER_DOCS.includes(doc.docType);
                const hasAA = AA_DOCS.includes(doc.docType);
                const hasTwoOptions = (hasDigiLocker || hasAA) && !complete;
                const docKey = doc.id || doc.docType;
                const docLabel = doc.isOther ? doc.label : (DOC_LABELS[doc.docType] || doc.docType);

                return (
                    <div key={docKey} className="portal-card card" style={complete ? { borderColor: 'rgba(16,185,129,0.3)' } : {}}>
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>📄</span>
                                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{docLabel}</h3>
                                {doc.status === 'rejected' && !complete && <span className="badge rejected" style={{ fontSize: 11 }}>Re-upload Required</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {getSourceBadge(doc)}
                                {complete && <span className="badge validated">✅ Verified</span>}
                            </div>
                        </div>

                        {/* Admin Comment Display */}
                        {doc.adminComment && (
                            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(56, 189, 248, 0.05)', borderLeft: '3px solid var(--accent-info)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>Message from ABCL Reviewer</div>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{doc.adminComment}</div>
                            </div>
                        )}

                        {/* Hint text */}
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {hasDigiLocker ? `Upload or fetch your ${docLabel} directly from DigiLocker.` :
                                hasAA ? `Upload or fetch your ${docLabel} directly from your bank.` :
                                    `Upload a clear image/PDF of your ${docLabel}. File name should contain "${docLabel.replace(/_/g, ' ').toLowerCase()}" for best validation.`}
                        </div>

                        {/* Previous rejection warning */}
                        {doc.status === 'rejected' && doc.validationResult && !complete && (
                            <div className="validation-result error" style={{ marginBottom: 12 }}>
                                <span className="validation-icon">⚠️</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Previous upload was rejected</div>
                                    <div>{doc.validationResult.message}</div>
                                </div>
                            </div>
                        )}

                        {/* Two-option layout for DigiLocker / AA documents */}
                        {hasTwoOptions && (
                            <>
                                <div className="doc-options-grid">
                                    {/* Upload option */}
                                    <div
                                        className="doc-option-card upload"
                                        onClick={() => document.getElementById(`file-${docKey}`)?.click()}
                                    >
                                        <div className="option-icon">📤</div>
                                        <div className="option-label">Upload File</div>
                                        <div className="option-sublabel">Click or drag & drop</div>
                                        <input
                                            id={`file-${docKey}`}
                                            type="file"
                                            accept="image/*,.pdf"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileSelect(docKey, e.target.files[0], docLabel)}
                                        />
                                    </div>

                                    {/* DigiLocker / AA option */}
                                    {hasDigiLocker && (
                                        <div className="doc-option-card digilocker" onClick={() => openDigiLocker()}>
                                            <span className="option-badge recommended">Recommended</span>
                                            <div className="option-icon">🔗</div>
                                            <div className="option-label">Fetch via DigiLocker</div>
                                            <div className="option-sublabel">Government Verified ↗</div>
                                        </div>
                                    )}
                                    {hasAA && (
                                        <div className="doc-option-card aa" onClick={() => openAA(docKey)}>
                                            <span className="option-badge recommended">Recommended</span>
                                            <div className="option-icon">🏦</div>
                                            <div className="option-label">Fetch via Account Aggregator</div>
                                            <div className="option-sublabel">Direct from your bank ↗</div>
                                        </div>
                                    )}
                                </div>
                                <div className="doc-options-divider">choose an option</div>
                            </>
                        )}

                        {/* Standard upload zone for non-DigiLocker/AA docs */}
                        {!hasTwoOptions && !complete && (
                            <div
                                className={`upload-zone ${uploading[docKey] ? 'drag-over' : ''}`}
                                onDrop={(e) => handleDrop(e, docKey, docLabel)}
                                onDragOver={handleDragOver}
                            >
                                {uploading[docKey] ? (
                                    <>
                                        <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }}></div>
                                        <div className="upload-text">Uploading & validating with AI/OCR...</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="upload-icon">📤</div>
                                        <div className="upload-text">
                                            Drag & drop your <strong>{docLabel}</strong> here
                                            <br />or <strong>click to browse</strong> (JPG, PNG, PDF)
                                        </div>
                                        <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect(docKey, e.target.files[0], docLabel)} />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Processing indicator for two-option uploads */}
                        {hasTwoOptions && uploading[docKey] && (
                            <div style={{ textAlign: 'center', padding: 20 }}>
                                <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }}></div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Uploading & validating with AI/OCR...</div>
                            </div>
                        )}

                        {/* Uploaded file display */}
                        {uploads[docKey] && !uploading[docKey] && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                                <span>📎</span>
                                <span style={{ flex: 1, fontSize: 13 }}>{uploads[docKey].name}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(uploads[docKey].size / 1024).toFixed(1)} KB</span>
                            </div>
                        )}

                        {/* Validation Result */}
                        {validations[docKey] && !uploading[docKey] && (
                            <div className={`validation-result ${validations[docKey].valid ? 'success' : 'error'}`}>
                                <span className="validation-icon">{validations[docKey].valid ? '✅' : '❌'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                        {validations[docKey].valid
                                            ? (validations[docKey].source === 'digilocker' ? 'Fetched via DigiLocker'
                                                : validations[docKey].source === 'account_aggregator' ? 'Fetched via Account Aggregator'
                                                    : validations[docKey].bypassed ? 'Document Accepted (Manual Override)'
                                                        : 'Document Verified')
                                            : 'Validation Failed'}
                                    </div>
                                    <div>{validations[docKey].message}</div>
                                </div>
                            </div>
                        )}

                        {/* Bypass Submission */}
                        {((validations[docKey] && !validations[docKey].valid && !uploading[docKey])
                            || (doc.status === 'rejected' && !validations[docKey]?.valid)) && (
                                <div style={{ marginTop: 12 }}>
                                    {!showBypass[docKey] ? (
                                        <button className="btn btn-sm btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--accent-warning)', color: 'var(--accent-warning)' }}
                                            onClick={() => setShowBypass(p => ({ ...p, [docKey]: true }))}>
                                            ⚠️ Submit Anyway with Remark
                                        </button>
                                    ) : (
                                        <div style={{ padding: 16, background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-warning)', marginBottom: 8 }}>⚠️ Submit with Manual Override</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Provide a reason. This will be visible to the reviewer.</div>
                                            <textarea className="form-textarea" placeholder="Enter your reason (required)..." style={{ minHeight: 60, marginBottom: 12, borderColor: 'rgba(245, 158, 11, 0.4)' }}
                                                value={bypassRemarks[docKey] || ''} onChange={(e) => setBypassRemarks(p => ({ ...p, [docKey]: e.target.value }))} />
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-sm btn-secondary" onClick={() => setShowBypass(p => ({ ...p, [docKey]: false }))} disabled={bypassing[docKey]}>Cancel</button>
                                                <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}
                                                    onClick={() => handleBypassSubmit(docKey, doc.uploadedFile, docLabel)}
                                                    disabled={!bypassRemarks[docKey]?.trim() || bypassing[docKey]}>
                                                    {bypassing[docKey] ? <><div className="spinner" style={{ width: 14, height: 14 }}></div> Submitting...</> : '✓ Confirm & Submit Anyway'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* Comment box */}
                        <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>💬 Add a comment or remark (optional)</label>
                            <textarea className="form-textarea" placeholder="Any additional information about this document..."
                                style={{ minHeight: 50 }} value={comments[docKey] || ''}
                                onChange={(e) => setComments(p => ({ ...p, [docKey]: e.target.value }))} />
                        </div>
                    </div>
                );
            })}

            {/* Submit All */}
            <div className="portal-card" style={{ textAlign: 'center' }}>
                <button className={`btn btn-lg ${canSubmitAll() ? 'btn-success' : 'btn-secondary'}`}
                    disabled={!canSubmitAll()} onClick={handleSubmitAll}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    {canSubmitAll() ? '✅ Submit All Documents' : `${completedDocs}/${totalDocs} documents verified — complete all to submit`}
                </button>
            </div>

            {/* ═══════════════ DigiLocker Modal ═══════════════ */}
            {digiModal.open && (
                <div className="modal-overlay digilocker-modal" onClick={() => !digiProcessing && setDigiModal({ open: false, step: 1 })}>
                    <div className="modal" style={{ borderTop: '4px solid #0d9488', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        {/* Step Indicator */}
                        <div className="step-indicator">
                            <div className={`step-dot ${digiModal.step === 1 ? 'digilocker-active' : digiModal.step > 1 ? 'completed' : ''}`}>{digiModal.step > 1 ? '✓' : '1'}</div>
                            <div className={`step-line ${digiModal.step > 1 ? 'completed' : ''}`}></div>
                            <div className={`step-dot ${digiModal.step === 2 ? 'digilocker-active' : digiModal.step > 2 ? 'completed' : ''}`}>{digiModal.step > 2 ? '✓' : '2'}</div>
                            <div className={`step-line ${digiModal.step > 2 ? 'completed' : ''}`}></div>
                            <div className={`step-dot ${digiModal.step === 3 ? 'digilocker-active' : ''}`}>3</div>
                        </div>

                        {/* Header */}
                        <div className="digilocker-header">
                            <div className="digi-icon">🔗</div>
                            <div className="shield-icon">🛡️</div>
                            <div className="tartan-icon">T</div>
                        </div>

                        {/* Step 1: Login */}
                        {digiModal.step === 1 && (
                            <div>
                                <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>Sign In via DigiLocker</h2>
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Meri Pehchaan — Single Sign-On Service</p>

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                                    <button className="btn btn-sm" style={{ background: '#0d9488', color: 'white' }}>Mobile</button>
                                    <button className="btn btn-sm btn-secondary">Username</button>
                                    <button className="btn btn-sm btn-secondary">Other ID</button>
                                </div>

                                <div className="form-group">
                                    <input className="form-input" type="tel" placeholder="Enter your mobile number" maxLength={10}
                                        value={digiPhone} onChange={(e) => setDigiPhone(e.target.value.replace(/\D/g, ''))} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 4, background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10 }}>✓</div>
                                    <span>PIN less authentication</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 4, background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10 }}>✓</div>
                                    <span>I consent to <span style={{ color: '#0d9488', textDecoration: 'underline' }}>terms of use</span></span>
                                </div>

                                <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', color: 'white' }}
                                    disabled={digiPhone.length < 10} onClick={() => setDigiModal(p => ({ ...p, step: 2 }))}>
                                    Sign In
                                </button>
                            </div>
                        )}

                        {/* Step 2: OTP */}
                        {digiModal.step === 2 && (
                            <div>
                                <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 8 }}>Verify OTP</h2>
                                <div style={{ textAlign: 'center', padding: '12px 16px', background: 'rgba(13, 148, 136, 0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    DigiLocker has sent an OTP to your registered mobile (xxxxx{digiPhone.slice(-4) || '0000'}). OTP will be valid for 10 minutes.
                                </div>

                                <div className="otp-input-group">
                                    {digiOtp.map((d, i) => (
                                        <input key={i} id={`otp-${i}`} type="text" maxLength={1} value={d} inputMode="numeric"
                                            onChange={(e) => handleDigiOtpChange(i, e.target.value)} />
                                    ))}
                                </div>

                                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                                    Resend OTP in <span style={{ color: '#0d9488', fontWeight: 600 }}>01:59</span>
                                </div>

                                <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', color: 'white' }}
                                    disabled={digiOtp.join('').length < 4}
                                    onClick={() => setDigiModal(p => ({ ...p, step: 3 }))}>
                                    Verify & Continue
                                </button>
                            </div>
                        )}

                        {/* Step 3: Consent & Document Selection */}
                        {digiModal.step === 3 && (
                            <div>
                                <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 8 }}>Consent & Documents</h2>
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                                    Please provide your consent to share the following with <strong>Tartan DocCollect</strong>:
                                </p>

                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Issued Documents</span>
                                    <span style={{ color: '#0d9488', cursor: 'pointer', fontSize: 12 }}
                                        onClick={() => setDigiConsent({ aadhaar: true, pan: true, dl: true })}>
                                        Select all
                                    </span>
                                </div>

                                <div className="consent-docs">
                                    <div className={`consent-doc-item ${digiConsent.aadhaar ? 'selected' : ''}`}
                                        onClick={() => setDigiConsent(p => ({ ...p, aadhaar: !p.aadhaar }))}>
                                        <div className="consent-checkbox">{digiConsent.aadhaar ? '✓' : ''}</div>
                                        <span style={{ fontSize: 14 }}>Aadhaar Card (XX2046)</span>
                                    </div>
                                    <div className={`consent-doc-item ${digiConsent.pan ? 'selected' : ''}`}
                                        onClick={() => setDigiConsent(p => ({ ...p, pan: !p.pan }))}>
                                        <div className="consent-checkbox">{digiConsent.pan ? '✓' : ''}</div>
                                        <span style={{ fontSize: 14 }}>PAN Verification Record (XXA9382A)</span>
                                    </div>
                                    <div className={`consent-doc-item ${digiConsent.dl ? 'selected' : ''}`}
                                        onClick={() => setDigiConsent(p => ({ ...p, dl: !p.dl }))}>
                                        <div className="consent-checkbox">{digiConsent.dl ? '✓' : ''}</div>
                                        <span style={{ fontSize: 14 }}>Driving License (XX005524)</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, marginBottom: 16 }}>
                                    Consent validity: Today + 31 days  •  By proceeding, you agree to share selected documents with Tartan.
                                </div>

                                {digiProcessing && <div className="processing-bar"></div>}

                                {(() => {
                                    const selectedCount = [digiConsent.aadhaar, digiConsent.pan].filter(Boolean).length;
                                    return (
                                        <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', color: 'white' }}
                                            disabled={selectedCount === 0 || digiProcessing}
                                            onClick={submitDigiLocker}>
                                            {digiProcessing ? <><div className="spinner" style={{ width: 16, height: 16 }}></div> Fetching {selectedCount} document{selectedCount > 1 ? 's' : ''} from DigiLocker...</> : `🔓 Allow & Fetch ${selectedCount} Document${selectedCount > 1 ? 's' : ''}`}
                                        </button>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════ Account Aggregator Modal ═══════════════ */}
            {aaModal.open && (
                <div className="modal-overlay" onClick={() => !aaProcessing && setAaModal({ open: false, docType: null, step: 1 })}>
                    <div className="modal" style={{ borderTop: '4px solid #3b82f6', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        {/* Step Indicator */}
                        <div className="step-indicator">
                            <div className={`step-dot ${aaModal.step === 1 ? 'aa-active' : aaModal.step > 1 ? 'completed' : ''}`}>{aaModal.step > 1 ? '✓' : '1'}</div>
                            <div className={`step-line ${aaModal.step > 1 ? 'completed' : ''}`}></div>
                            <div className={`step-dot ${aaModal.step === 2 ? 'aa-active' : aaModal.step > 2 ? 'completed' : ''}`}>{aaModal.step > 2 ? '✓' : '2'}</div>
                            <div className={`step-line ${aaModal.step > 2 ? 'completed' : ''}`}></div>
                            <div className={`step-dot ${aaModal.step === 3 ? 'aa-active' : ''}`}>3</div>
                        </div>

                        {/* Step 1: Select Bank */}
                        {aaModal.step === 1 && (
                            <div>
                                <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>Select Your Bank</h2>
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                                    Choose your bank to fetch statements securely via Account Aggregator
                                </p>

                                <div className="bank-grid">
                                    {BANKS.map(bank => (
                                        <div key={bank.id} className={`bank-card ${aaBank === bank.id ? 'selected' : ''}`}
                                            onClick={() => setAaBank(bank.id)}>
                                            <div className="bank-icon">{bank.icon}</div>
                                            <div className="bank-name">{bank.name}</div>
                                        </div>
                                    ))}
                                </div>

                                <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: 'white', marginTop: 12 }}
                                    disabled={!aaBank} onClick={() => setAaModal(p => ({ ...p, step: 2 }))}>
                                    Continue with {aaBank ? BANKS.find(b => b.id === aaBank)?.name : '...'}
                                </button>
                            </div>
                        )}

                        {/* Step 2: Bank Login */}
                        {aaModal.step === 2 && (
                            <div>
                                <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>
                                    {BANKS.find(b => b.id === aaBank)?.icon} {BANKS.find(b => b.id === aaBank)?.name} Login
                                </h2>
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
                                    Enter your net banking credentials to proceed
                                </p>

                                <div style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3b82f6' }}>
                                    🔒 Your credentials are encrypted and never stored. RBI regulated process.
                                </div>

                                <div className="form-group">
                                    <label>Customer ID / User ID</label>
                                    <input className="form-input" type="text" placeholder="Enter your customer ID"
                                        value={aaUserId} onChange={(e) => setAaUserId(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input className="form-input" type="password" placeholder="Enter your password"
                                        value={aaPassword} onChange={(e) => setAaPassword(e.target.value)} />
                                </div>

                                <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: 'white' }}
                                    disabled={!aaUserId || !aaPassword} onClick={() => setAaModal(p => ({ ...p, step: 3 }))}>
                                    Login & Continue
                                </button>
                            </div>
                        )}

                        {/* Step 3: Consent */}
                        {aaModal.step === 3 && (
                            <div>
                                <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 8 }}>Consent for Data Sharing</h2>
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                                    Review and approve sharing your bank statement with Tartan
                                </p>

                                <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Data Type:</span><br /><strong>Bank Statement</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Period:</span><br /><strong>Last 6 months</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Purpose:</span><br /><strong>Loan Processing</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Validity:</span><br /><strong>One-time use</strong></div>
                                    </div>
                                </div>

                                <div className={`consent-doc-item ${aaConsent ? 'selected' : ''}`} onClick={() => setAaConsent(!aaConsent)} style={{ marginBottom: 16 }}>
                                    <div className="consent-checkbox">{aaConsent ? '✓' : ''}</div>
                                    <span style={{ fontSize: 13 }}>I consent to share my bank statement data as described above. This process is RBI regulated under the Account Aggregator framework.</span>
                                </div>

                                {aaProcessing && <div className="processing-bar aa"></div>}

                                <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: 'white' }}
                                    disabled={!aaConsent || aaProcessing} onClick={submitAA}>
                                    {aaProcessing ? <><div className="spinner" style={{ width: 16, height: 16 }}></div> Fetching from Bank...</> : '✅ Approve & Fetch Statement'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</div>}
        </div>
    );
}
