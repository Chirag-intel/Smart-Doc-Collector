import { NextResponse } from 'next/server';
import { getStoreAsync } from '@/lib/store';
import { validateDocument } from '@/lib/ocr-validator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    const { token } = await params;
    const { store } = await getStoreAsync();
    const caseItem = store.getCaseByToken(token);

    if (!caseItem) {
        return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const pendingDocs = caseItem.pendingDocuments.filter(
        d => d.status === 'pending' || d.status === 'rejected'
    );

    return NextResponse.json({
        customerName: caseItem.customerName,
        loanType: caseItem.loanType,
        loanId: caseItem.loanId,
        caseId: caseItem.id,
        documents: caseItem.pendingDocuments,
        pendingDocuments: pendingDocs,
    });
}

export async function POST(request, { params }) {
    try {
        const { token } = await params;
        const { store, save } = await getStoreAsync();
        const caseItem = store.getCaseByToken(token);

        if (!caseItem) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
        }

        const formData = await request.formData();
        const docType = formData.get('docType');
        const file = formData.get('file');
        const comment = formData.get('comment') || '';
        const source = formData.get('source') || 'manual'; // manual | digilocker | account_aggregator

        if (!docType || !file) {
            return NextResponse.json({ error: 'Document type and file are required' }, { status: 400 });
        }

        const bypass = formData.get('bypass') === 'true';
        const bypassRemark = formData.get('bypassRemark') || '';

        let validationResult;
        let status;
        const baseDocType = docType.split('-')[0]; // Extract base type from ID (e.g. "other-uuid" → "other")

        // DigiLocker / Account Aggregator — skip OCR, auto-validate
        if (source === 'digilocker' || source === 'account_aggregator') {
            const sourceLabel = source === 'digilocker' ? 'DigiLocker' : 'Account Aggregator';
            const badge = source === 'digilocker' ? '🔗 Government Verified' : '🏦 Bank Verified';
            status = 'validated';
            validationResult = {
                valid: true,
                detectedType: baseDocType,
                expectedType: baseDocType,
                confidence: 1.0,
                message: `Document fetched via ${sourceLabel}. ${badge}`,
                source,
                sourceLabel,
                verified: true,
            };
            store.addRemark(
                caseItem.id,
                `✅ ${baseDocType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} fetched via ${sourceLabel} (${badge})`,
                caseItem.customerName
            );
        } else {
            // Find the actual doc item by ID or base docType
            const docItem = caseItem.pendingDocuments.find(d => d.id === docType || d.docType === baseDocType);
            const adminComment = docItem?.adminComment || '';
            const isOther = docItem?.isOther || false;

            // Manual upload — run OCR validation
            // For "other" doc types, OCR can't reliably validate the exact type, so we accept any valid image/pdf
            validationResult = validateDocument(isOther ? 'unknown' : (docItem ? docItem.docType : baseDocType), file.name, null);
            status = validationResult.valid ? 'validated' : 'rejected';

            // Verify against ABCL admin comment if present
            if (status === 'validated' && adminComment) {
                if (adminComment.toLowerCase().includes('month') || adminComment.toLowerCase().includes('year')) {
                    validationResult.message += ` (System matched ABCL condition: "${adminComment}")`;
                }
            }

            // Allow bypass: customer can submit with a remark even if OCR rejects
            if (!validationResult.valid && bypass && bypassRemark.trim()) {
                status = 'validated';
                validationResult.bypassed = true;
                validationResult.bypassRemark = bypassRemark.trim();
                validationResult.message = `Document accepted via manual override. Customer remark: "${bypassRemark.trim()}"`;

                store.addRemark(
                    caseItem.id,
                    `📌 Bypass submission for ${baseDocType.replace(/_/g, ' ').toUpperCase()}: "${bypassRemark.trim()}" (OCR had flagged: ${validationResult.detectedType || 'unclear document'})`,
                    caseItem.customerName
                );
            }
        }

        // Update doc status in store
        store.updateDocumentStatus(caseItem.id, docType, status, file.name, validationResult, comment);

        // Persist atomically to Redis (or disk in dev)
        await save();

        return NextResponse.json({
            success: true,
            validation: validationResult,
            docType,
            status,
            source,
            bypassed: bypass && !validationResult?.valid,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
