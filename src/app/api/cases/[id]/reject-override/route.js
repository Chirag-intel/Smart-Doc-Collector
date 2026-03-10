import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const store = getStore();
        const caseItem = store.getCaseById(id);

        if (!caseItem) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        const { docId, reason } = body;

        if (!reason || !reason.trim()) {
            return NextResponse.json({ error: 'A reason for rejection is required.' }, { status: 400 });
        }

        // Find the document (support both id and docType lookup)
        let doc = caseItem.pendingDocuments.find(d => String(d.id) === String(docId) || String(d.docType) === String(docId));
        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Only allow rejecting documents that were manually overridden (bypassed)
        if (!doc.validationResult?.bypassed) {
            return NextResponse.json({ error: 'This document was not manually overridden and cannot be rejected via this action.' }, { status: 400 });
        }

        const prevFile = doc.uploadedFile;
        const prevReason = doc.validationResult?.bypassReason;

        // Revert to rejected/pending — clear the override
        doc.status = 'rejected';
        doc.uploadedFile = null;
        doc.adminComment = reason.trim();
        doc.validationResult = {
            valid: false,
            detectedType: doc.docType,
            expectedType: doc.docType,
            message: `Manual override rejected by admin. Reason: ${reason.trim()}`,
            bypassed: false,
            rejectedOverride: true,
            previousBypassReason: prevReason || null,
            previousFile: prevFile || null,
        };

        // Recalculate case status
        const allValidated = caseItem.pendingDocuments.every(d => d.status === 'validated');
        const anyValidated = caseItem.pendingDocuments.some(d => d.status === 'validated');
        if (allValidated) {
            caseItem.status = 'completed';
        } else if (anyValidated) {
            caseItem.status = 'partial';
        } else {
            caseItem.status = 'rejected';
        }

        // Add audit remark
        store.addRemark(
            id,
            `❌ Manual Override Rejected for ${doc.label || doc.docType} by Admin. Reason: "${reason.trim()}"${prevFile ? `. Previously uploaded file: ${prevFile}` : ''}`,
            'Admin'
        );

        store._saveToDisk();

        return NextResponse.json({
            success: true,
            doc,
            caseStatus: caseItem.status,
        });

    } catch (error) {
        console.error('Reject override error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
