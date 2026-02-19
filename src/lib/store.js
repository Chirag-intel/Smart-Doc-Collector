import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const PERSIST_PATH = '/tmp/phantom-eclipse-store.json';

// Document types supported
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

// Seed cases
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
            { docType: 'pan_card', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { docType: 'aadhaar_card', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { docType: 'bank_statement', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
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
            { docType: 'pan_card', status: 'validated', uploadedFile: 'pan_priya.jpg', validationResult: { valid: true, detectedType: 'pan_card', message: 'PAN Card verified successfully' }, comment: '' },
            { docType: 'address_proof', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { docType: 'salary_slip', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
            { docType: 'itr', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
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
            { docType: 'pan_card', status: 'validated', uploadedFile: 'pan_amit.jpg', validationResult: { valid: true, detectedType: 'pan_card', message: 'PAN Card verified successfully' }, comment: '' },
            { docType: 'aadhaar_card', status: 'validated', uploadedFile: 'aadhaar_amit.jpg', validationResult: { valid: true, detectedType: 'aadhaar_card', message: 'Aadhaar Card verified successfully' }, comment: '' },
            { docType: 'passport', status: 'validated', uploadedFile: 'passport_amit.jpg', validationResult: { valid: true, detectedType: 'passport', message: 'Passport verified successfully' }, comment: '' },
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
            { docType: 'pan_card', status: 'rejected', uploadedFile: 'wrong_doc.jpg', validationResult: { valid: false, detectedType: 'aadhaar_card', expectedType: 'pan_card', message: 'Expected PAN Card but detected Aadhaar Card. Please upload the correct document.' }, comment: '' },
            { docType: 'photograph', status: 'pending', uploadedFile: null, validationResult: null, comment: '' },
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

// In-memory store with file persistence
class Store {
    constructor() {
        const loaded = this._loadFromDisk();
        if (loaded) {
            this.cases = loaded.cases;
            this.linkTokens = loaded.linkTokens;
            // Always ensure seed tokens exist (in case file is from old version)
            Object.keys(seedLinkTokens).forEach(k => {
                if (!this.linkTokens[k]) this.linkTokens[k] = seedLinkTokens[k];
            });
        } else {
            this.cases = [...seedCases.map(c => ({ ...c, pendingDocuments: c.pendingDocuments.map(d => ({ ...d })), links: c.links.map(l => ({ ...l })), remarks: c.remarks.map(r => ({ ...r })) }))];
            this.linkTokens = { ...seedLinkTokens };
            this._saveToDisk();
        }
    }

    _loadFromDisk() {
        try {
            if (fs.existsSync(PERSIST_PATH)) {
                const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
                const data = JSON.parse(raw);
                if (data && data.cases && data.linkTokens) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('[Store] Failed to load persisted data, using seed:', e.message);
        }
        return null;
    }

    _saveToDisk() {
        try {
            fs.writeFileSync(PERSIST_PATH, JSON.stringify({ cases: this.cases, linkTokens: this.linkTokens }, null, 2), 'utf-8');
        } catch (e) {
            console.warn('[Store] Failed to persist data:', e.message);
        }
    }

    // Cases
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
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail,
            customerType: data.customerType || 'Customer',
            loanType: data.loanType || 'Personal Loan',
            loanId: data.loanId || `LN-${Date.now()}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            pendingDocuments: (data.pendingDocuments || []).map(docType => ({
                docType,
                status: 'pending',
                uploadedFile: null,
                validationResult: null,
                comment: '',
            })),
            links: [],
            remarks: [],
        };
        this.cases.unshift(newCase);
        this._saveToDisk();
        return newCase;
    }

    // Link generation
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
            this._saveToDisk();
            return { token, link };
        }
        return null;
    }

    // Add additional link entry for multi-channel sends (same token)
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
            this._saveToDisk();
        }
    }

    getCaseByToken(token) {
        const caseId = this.linkTokens[token];
        if (!caseId) return null;
        return this.getCaseById(caseId);
    }

    // Upload & validation
    updateDocumentStatus(caseId, docType, status, uploadedFile, validationResult, comment) {
        const caseItem = this.getCaseById(caseId);
        if (!caseItem) return null;
        const doc = caseItem.pendingDocuments.find(d => d.docType === docType);
        if (!doc) return null;
        doc.status = status;
        if (uploadedFile) doc.uploadedFile = uploadedFile;
        if (validationResult) doc.validationResult = validationResult;
        if (comment !== undefined) doc.comment = comment;

        // Update case status
        const allValidated = caseItem.pendingDocuments.every(d => d.status === 'validated');
        const anyUploaded = caseItem.pendingDocuments.some(d => d.status === 'validated' || d.status === 'uploaded');
        const anyRejected = caseItem.pendingDocuments.some(d => d.status === 'rejected');

        if (allValidated) {
            caseItem.status = 'completed';
        } else if (anyRejected) {
            caseItem.status = 'rejected';
        } else if (anyUploaded) {
            caseItem.status = 'partial';
        }

        this._saveToDisk();
        return doc;
    }

    addRemark(caseId, text, author) {
        const caseItem = this.getCaseById(caseId);
        if (!caseItem) return null;
        const remark = { text, author, createdAt: new Date().toISOString() };
        caseItem.remarks.push(remark);
        this._saveToDisk();
        return remark;
    }

    getStats() {
        const total = this.cases.length;
        const pending = this.cases.filter(c => c.status === 'pending').length;
        const partial = this.cases.filter(c => c.status === 'partial').length;
        const completed = this.cases.filter(c => c.status === 'completed').length;
        const rejected = this.cases.filter(c => c.status === 'rejected').length;
        const totalDocs = this.cases.reduce((acc, c) => acc + c.pendingDocuments.length, 0);
        const collectedDocs = this.cases.reduce((acc, c) => acc + c.pendingDocuments.filter(d => d.status === 'validated').length, 0);
        return { total, pending, partial, completed, rejected, totalDocs, collectedDocs };
    }
}

// Singleton — use globalThis to survive Next.js dev mode module re-evaluations
// In dev mode, Turbopack re-evaluates modules on each compile, which resets
// module-level variables like `let storeInstance = null`. globalThis persists.
export function getStore() {
    if (!globalThis.__phantomStore) {
        globalThis.__phantomStore = new Store();
    }
    return globalThis.__phantomStore;
}

export default getStore;
