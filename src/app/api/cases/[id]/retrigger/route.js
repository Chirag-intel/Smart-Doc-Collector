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

        const { docId, channels = ['email'], remark } = body;

        let doc = caseItem.pendingDocuments.find(d => String(d.id) === String(docId) || String(d.docType) === String(docId));
        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Reset document to pending to force re-upload
        doc.status = 'pending';
        doc.uploadedFile = null;
        doc.validationResult = null;
        doc.adminComment = remark || doc.adminComment;

        // Recalculate case overall status if rejecting/resetting
        const anyUploaded = caseItem.pendingDocuments.some(d => d.status === 'validated' || d.status === 'uploaded');
        caseItem.status = anyUploaded ? 'partial' : 'pending';

        // Generate a single link token for the first channel (like send-link does)
        const result = store.generateLink(id, channels[0]);
        if (!result) {
            return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
        }

        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        const uploadUrl = `${baseUrl}/upload/${result.token}`;

        // Record link entries for each additional selected channel marking them as retrigger
        caseItem.links[caseItem.links.length - 1].isRetrigger = true; // Annotate the first link

        for (let i = 1; i < channels.length; i++) {
            const ch = channels[i];
            caseItem.links.push({
                id: `link-${Date.now()}-${i}`,
                token: result.token,
                channel: ch,
                sentAt: new Date().toISOString(),
                status: 'sent',
                isRetrigger: true, // Identify as retrigger link
            });
        }

        const notifications = channels.map(channel => ({
            channel,
            recipient: channel === 'email' ? caseItem.customerEmail : caseItem.customerPhone,
            message: `Action Required: Dear ${caseItem.customerName}, your document "${doc.label || doc.docType}" needs to be re-uploaded. Reason: ${remark || 'Rejected'}. Please use this link: ${uploadUrl}`,
            uploadUrl,
            sentAt: result.link.sentAt,
        }));

        if (remark) {
            store.addRemark(id, `🔄 Retriggered Link for ${doc.label || doc.docType}. Reason: ${remark}`, 'Agent');
        }

        store._saveToDisk();

        return NextResponse.json({
            success: true,
            link: result.link,
            uploadUrl,
            channels,
            notifications,
        });

    } catch (error) {
        console.error('Send retrigger link error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
