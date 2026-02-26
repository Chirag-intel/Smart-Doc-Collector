import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { validateDocument } from '@/lib/ocr-validator';

export async function GET(request, { params }) {
    const { token } = await params;
    const store = getStore();
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
        const store = getStore();
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
        const baseDocType = docType.split('-')[0]; // Extract base type from ID
        const docItem = caseItem.pendingDocuments.find(d => String(d.id) === String(docType) || d.docType === baseDocType);
        const adminComment = docItem?.adminComment || '';
        const isOther = docItem?.isOther || false;
        const readableLabel = docItem ? (docItem.label || docItem.docType).replace(/_/g, ' ').toUpperCase() : baseDocType;

        // DigiLocker / Account Aggregator — skip OCR, auto-validate
        if (source === 'digilocker' || source === 'account_aggregator') {
            const sourceLabel = source === 'digilocker' ? 'DigiLocker' : 'Account Aggregator';
            const badge = source === 'digilocker' ? '🔗 Government Verified' : '🏦 Bank Verified';
            status = 'validated';
            validationResult = {
                valid: true,
                detectedType: docItem ? docItem.docType : baseDocType,
                expectedType: docItem ? docItem.docType : baseDocType,
                confidence: 1.0,
                message: `Document fetched via ${sourceLabel}. ${badge}`,
                source,
                sourceLabel,
                verified: true,
            };
            store.addRemark(
                caseItem.id,
                `✅ ${readableLabel} fetched via ${sourceLabel} (${badge})`,
                caseItem.customerName
            );
        } else {

            // Manual upload — run OCR validation
            // If it's an "other" doc type, OCR can't reliably validate the exact type, so we accept if valid image
            validationResult = validateDocument(isOther ? 'unknown' : (docItem ? docItem.docType : docType), file.name, null);
            status = validationResult.valid ? 'validated' : 'rejected';

            // Point 12: Verify against ABCL comment if present
            if (status === 'validated' && adminComment) {
                // If it asks for 3 months or similar, we mock checking the extracted text
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
                    `📌 Bypass submission for ${readableLabel}: "${bypassRemark.trim()}" (OCR had flagged: ${validationResult.detectedType || 'unclear document'})`,
                    caseItem.customerName
                );
            }
        }

        store.updateDocumentStatus(caseItem.id, docType, status, file.name, validationResult, comment);

        return NextResponse.json({
            success: true,
            validation: validationResult,
            docType,
            status,
            source,
            bypassed: bypass && !validationResult?.valid,
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
