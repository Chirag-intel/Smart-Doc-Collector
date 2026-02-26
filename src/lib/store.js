import { v4 as uuidv4 } from 'uuid';

// ─── Persistence Strategy ─────────────────────────────────────────────────────
// Production (Vercel): Uses Upstash Redis via REST API — persistent across
//   serverless function invocations (no more expired links / stale status).
// Local dev: Falls back to in-memory with optional /tmp file persistence.
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = 'phantom_store_v2';

// ─── Document types ───────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
    { id: 'pan_card', label: 'PAN Card', description: 'Permanent Account Number card' },
    { id: 'aadhaar_card', label: 'Aadhaar Card', description: '12-digit unique identity number' },
    { id: 'address_proof', label: 'Address Proof', description: 'Utility bill, rent agreement, etc.' },
    { id: 'bank_statement', label: 'Bank Statement', description: 'Last 6 months bank statement' },
    { id: 'passport', label: 'Passport', description: 'Valid passport' },
    { id: 'photograph', label: 'Photograph', description: 'Passport size photograph' },
    { id: 'salary_slip', label: 'Salary Slip', description: 'Last 3 months salary slips' },
    { id: 'itr', label: 'ITR', description: 'Income Tax Return documents' },
    { id: 'signature', label: 'Signature', description: 'Digital signature specimen' },
];

// ─── Seed data ────────────────────────────────────────────────────────────────
const seedCases = [
    {
        id: 'case-001',
        customerName: 'Rajesh Kumar',
        customerPhone: '+91 98765 43210',
        customerEmail: 'rajesh.kumar@email.com',
        customerType: 'Customer',
        loanType: 'Personal Loan',
        loanId: 'PL-2026-00142',
        status: 'pending',
        createdAt: '2026-02-17T10:30:00Z',
        pendingDocuments: [
            { id: 'pan_card', docType: 'pan_card', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { id: 'aadhaar_card', docType: 'aadhaar_card', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { id: 'bank_statement', docType: 'bank_statement', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
        ],
        links: [],
        remarks: [],
    },
    {
        id: 'case-002',
        customerName: 'Priya Sharma',
        customerPhone: '+91 87654 32109',
        customerEmail: 'priya.sharma@email.com',
        customerType: 'Customer',
        loanType: 'Home Loan',
        loanId: 'HL-2026-00087',
        status: 'partial',
        createdAt: '2026-02-15T14:20:00Z',
        pendingDocuments: [
            { id: 'pan_card', docType: 'pan_card', label: '', adminComment: '', isOther: false, status: 'validated', uploadedFile: 'pan_priya.jpg', validationResult: { valid: true, detectedType: 'pan_card', message: 'PAN Card verified successfully' }, comment: '' },
            { id: 'address_proof', docType: 'address_proof', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { id: 'salary_slip', docType: 'salary_slip', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { id: 'itr', docType: 'itr', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
        ],
        links: [
            { id: 'link-001', token: 'tkn-abc123', channel: 'email', sentAt: '2026-02-15T14:25:00Z', status: 'sent' },
        ],
        remarks: [],
    },
    {
        id: 'case-003',
        customerName: 'Amit Patel',
        customerPhone: '+91 76543 21098',
        customerEmail: 'amit.patel@email.com',
        customerType: 'DSA',
        loanType: 'Business Loan',
        loanId: 'BL-2026-00203',
        status: 'completed',
        createdAt: '2026-02-10T09:15:00Z',
        pendingDocuments: [
            { id: 'pan_card', docType: 'pan_card', label: '', adminComment: '', isOther: false, status: 'validated', uploadedFile: 'pan_amit.jpg', validationResult: { valid: true, detectedType: 'pan_card', message: 'PAN Card verified successfully' }, comment: '' },
            { id: 'aadhaar_card', docType: 'aadhaar_card', label: '', adminComment: '', isOther: false, status: 'validated', uploadedFile: 'aadhaar_amit.jpg', validationResult: { valid: true, detectedType: 'aadhaar_card', message: 'Aadhaar Card verified successfully' }, comment: '' },
            { id: 'passport', docType: 'passport', label: '', adminComment: '', isOther: false, status: 'validated', uploadedFile: 'passport_amit.jpg', validationResult: { valid: true, detectedType: 'passport', message: 'Passport verified successfully' }, comment: '' },
        ],
        links: [
            { id: 'link-002', token: 'tkn-def456', channel: 'whatsapp', sentAt: '2026-02-10T09:20:00Z', status: 'sent' },
            { id: 'link-003', token: 'tkn-ghi789', channel: 'sms', sentAt: '2026-02-12T11:00:00Z', status: 'sent' },
        ],
        remarks: [{ text: 'All documents verified and approved', author: 'System', createdAt: '2026-02-13T16:00:00Z' }],
    },
    {
        id: 'case-004',
        customerName: 'Sunita Verma',
        customerPhone: '+91 65432 10987',
        customerEmail: 'sunita.verma@email.com',
        customerType: 'Customer',
        loanType: 'Vehicle Loan',
        loanId: 'VL-2026-00056',
        status: 'rejected',
        createdAt: '2026-02-12T16:45:00Z',
        pendingDocuments: [
            { id: 'pan_card', docType: 'pan_card', label: '', adminComment: '', isOther: false, status: 'rejected', uploadedFile: 'wrong_doc.jpg', validationResult: { valid: false, detectedType: 'aadhaar_card', expectedType: 'pan_card', message: 'Expected PAN Card but detected Aadhaar Card. Please upload the correct document.' }, comment: '' },
            { id: 'photograph', docType: 'photograph', label: '', adminComment: '', isOther: false, status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
        ],
        links: [
            { id: 'link-004', token: 'tkn-jkl012', channel: 'email', sentAt: '2026-02-12T16:50:00Z', status: 'sent' },
        ],
        remarks: [{ text: 'Wrong document uploaded for PAN Card, please re-upload', author: 'Admin', createdAt: '2026-02-13T10:00:00Z' }],
    },
];

const seedLinkTokens = {
    'tkn-abc123': 'case-002',
    'tkn-def456': 'case-003',
    'tkn-ghi789': 'case-003',
    'tkn-jkl012': 'case-004',
};

// ─── Redis helpers (Upstash REST API) ────────────────────────────────────────
async function redisGet(key) {
    const res = await fetch(`${REDIS_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        cache: 'no-store',
    });
    const data = await res.json();
    if (data.result == null) return null;
    return JSON.parse(data.result);
}

async function redisSet(key, value) {
    await fetch(`${REDIS_URL}/set/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(value) }),
    });
}

// ─── Local (dev) helpers ──────────────────────────────────────────────────────
let _devStore = null; // In-memory for local dev

function getDevSeedData() {
    return {
        cases: seedCases.map(c => ({
            ...c,
            pendingDocuments: c.pendingDocuments.map(d => ({ ...d })),
            links: c.links.map(l => ({ ...l })),
            remarks: c.remarks.map(r => ({ ...r })),
        })),
        linkTokens: { ...seedLinkTokens },
    };
}

function loadDevStore() {
    if (_devStore) return _devStore;
    try {
        const fs = require('fs');
        const PERSIST_PATH = '/tmp/phantom-eclipse-store.json';
        if (fs.existsSync(PERSIST_PATH)) {
            const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
            const data = JSON.parse(raw);
            if (data && data.cases && data.linkTokens) {
                // Merge seed tokens in case of updates
                Object.keys(seedLinkTokens).forEach(k => {
                    if (!data.linkTokens[k]) data.linkTokens[k] = seedLinkTokens[k];
                });
                _devStore = data;
                return _devStore;
            }
        }
    } catch (e) {
        console.warn('[Store] Failed to load dev data:', e.message);
    }
    _devStore = getDevSeedData();
    saveDevStore();
    return _devStore;
}

function saveDevStore() {
    try {
        const fs = require('fs');
        fs.writeFileSync('/tmp/phantom-eclipse-store.json', JSON.stringify(_devStore, null, 2), 'utf-8');
    } catch (e) {
        console.warn('[Store] Failed to save dev data:', e.message);
    }
}

// ─── Store class (async-capable) ─────────────────────────────────────────────
class Store {
    constructor(data) {
        this.cases = data.cases;
        this.linkTokens = data.linkTokens;
    }

    // ─── Case operations ─────────────────────────────────────────────────
    getAllCases() {
        return this.cases.map(c => ({
            ...c,
            pendingCount: c.pendingDocuments.filter(d => d.status === 'pending' || d.status === 'rejected').length,
            totalDocs: c.pendingDocuments.length,
            completedDocs: c.pendingDocuments.filter(d => d.status === 'validated').length,
        }));
    }

    getCaseById(id) {
        return this.cases.find(c => c.id === id) || null;
    }

    createCase(data) {
        const newCase = {
            id: `case-${uuidv4().slice(0, 8)}`,
            customerName: data.customerName,
            customerPhone: data.customerPhone || '',
            customerEmail: data.customerEmail,
            customerType: data.customerType || 'Customer',
            loanType: data.loanType || 'Personal Loan',
            loanId: data.loanId || `LN-${Date.now()}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            pendingDocuments: (data.pendingDocuments || []).map(doc => {
                const isObj = typeof doc === 'object';
                const docId = isObj ? (doc.id || doc.docType) : doc;
                const docTypeStr = isObj ? doc.docType : doc;
                return {
                    id: docId,
                    docType: docTypeStr,
                    label: isObj ? (doc.label || '') : '',
                    adminComment: isObj ? (doc.adminComment || '') : '',
                    isOther: isObj ? (doc.isOther || docTypeStr === 'other') : docTypeStr === 'other',
                    status: 'pending',
                    uploadedFile: null,
                    validationResult: null,
                    comment: '',
                };
            }),
            links: [],
            remarks: [],
        };
        this.cases.unshift(newCase);
        return newCase;
    }

    // ─── Link operations ─────────────────────────────────────────────────
    getCaseByToken(token) {
        const caseId = this.linkTokens[token];
        if (!caseId) return null;
        return this.getCaseById(caseId);
    }

    generateLink(caseId, channel) {
        const token = `tkn-${uuidv4().slice(0, 12)}`;
        this.linkTokens[token] = caseId;
        const caseItem = this.getCaseById(caseId);
        if (caseItem) {
            const link = {
                id: `link-${uuidv4().slice(0, 8)}`,
                token,
                channel,
                sentAt: new Date().toISOString(),
                status: 'sent',
            };
            caseItem.links.push(link);
            return { token, link };
        }
        return null;
    }

    addLinkEntry(caseId, channel, token) {
        const caseItem = this.getCaseById(caseId);
        if (caseItem) {
            caseItem.links.push({
                id: `link-${uuidv4().slice(0, 8)}`,
                token,
                channel,
                sentAt: new Date().toISOString(),
                status: 'sent',
            });
        }
    }

    // ─── Document operations ─────────────────────────────────────────────
    updateDocumentStatus(caseId, docId, status, uploadedFile, validationResult, comment) {
        const caseItem = this.getCaseById(caseId);
        if (!caseItem) return null;
        // Try exact ID match first, then fallback to base docType
        let doc = caseItem.pendingDocuments.find(d => d.id === docId);
        if (!doc) {
            const baseType = docId.split('-')[0];
            doc = caseItem.pendingDocuments.find(d => d.docType === baseType || d.id === baseType);
        }
        if (!doc) return null;

        doc.status = status;
        if (uploadedFile) doc.uploadedFile = uploadedFile;
        if (validationResult) doc.validationResult = validationResult;
        if (comment !== undefined) doc.comment = comment;

        // Recalculate case status
        const allValidated = caseItem.pendingDocuments.every(d => d.status === 'validated');
        const anyRejected = caseItem.pendingDocuments.some(d => d.status === 'rejected');
        const anyUploaded = caseItem.pendingDocuments.some(d => d.status === 'validated' || d.status === 'uploaded');

        if (allValidated) {
            caseItem.status = 'completed';
            if (!caseItem.completedAt) {
                caseItem.completedAt = new Date().toISOString();
                caseItem.remarks.push({
                    text: `📧 All documents submitted. Case marked COMPLETED for Loan ID ${caseItem.loanId}.`,
                    author: 'System',
                    createdAt: new Date().toISOString(),
                });
            }
        } else if (anyRejected) {
            caseItem.status = 'issues';
        } else if (anyUploaded) {
            caseItem.status = 'partial';
        }

        return doc;
    }

    addRemark(caseId, text, author) {
        const caseItem = this.getCaseById(caseId);
        if (!caseItem) return null;
        const remark = { text, author, createdAt: new Date().toISOString() };
        caseItem.remarks.push(remark);
        return remark;
    }

    getStats() {
        const total = this.cases.length;
        const pending = this.cases.filter(c => c.status === 'pending').length;
        const partial = this.cases.filter(c => c.status === 'partial').length;
        const completed = this.cases.filter(c => c.status === 'completed').length;
        const rejected = this.cases.filter(c => c.status === 'rejected' || c.status === 'issues').length;
        const totalDocs = this.cases.reduce((acc, c) => acc + c.pendingDocuments.length, 0);
        const collectedDocs = this.cases.reduce((acc, c) => acc + c.pendingDocuments.filter(d => d.status === 'validated').length, 0);
        return { total, pending, partial, completed, rejected, totalDocs, collectedDocs };
    }
}

// ─── Get store: async factory ─────────────────────────────────────────────────
// Returns a { store, save } pair so callers can persist after mutations.
export async function getStoreAsync() {
    const useRedis = !!(REDIS_URL && REDIS_TOKEN);

    if (useRedis) {
        // Production: load from Redis
        let data = await redisGet(REDIS_KEY);
        if (!data) {
            // First boot: seed Redis
            data = getDevSeedData();
            await redisSet(REDIS_KEY, data);
        } else {
            // Ensure seed tokens always exist (idempotent)
            let modified = false;
            Object.keys(seedLinkTokens).forEach(k => {
                if (!data.linkTokens[k]) { data.linkTokens[k] = seedLinkTokens[k]; modified = true; }
            });
            if (modified) await redisSet(REDIS_KEY, data);
        }
        const store = new Store(data);
        const save = async () => {
            await redisSet(REDIS_KEY, { cases: store.cases, linkTokens: store.linkTokens });
        };
        return { store, save };
    } else {
        // Dev: in-memory + /tmp file
        const data = loadDevStore();
        const store = new Store(data);
        const save = async () => {
            _devStore = { cases: store.cases, linkTokens: store.linkTokens };
            saveDevStore();
        };
        return { store, save };
    }
}

// ─── Sync shim for backwards compatibility (local dev only) ──────────────────
// WARNING: Do NOT use this in production. Vercel routes must use getStoreAsync.
export function getStore() {
    if (REDIS_URL && REDIS_TOKEN) {
        throw new Error('[Store] Use getStoreAsync() in production API routes.');
    }
    const data = loadDevStore();
    const store = new Store(data);
    // Monkey-patch save on all mutating methods
    const wrapMutate = (fn) => function (...args) {
        const result = fn.apply(store, args);
        _devStore = { cases: store.cases, linkTokens: store.linkTokens };
        saveDevStore();
        return result;
    };
    store.createCase = wrapMutate(store.createCase);
    store.generateLink = wrapMutate(store.generateLink);
    store.addLinkEntry = wrapMutate(store.addLinkEntry);
    store.updateDocumentStatus = wrapMutate(store.updateDocumentStatus);
    store.addRemark = wrapMutate(store.addRemark);
    return store;
}

export default getStoreAsync;
