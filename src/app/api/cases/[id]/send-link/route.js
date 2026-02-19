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

        // Support both single channel and multiple channels
        const channels = body.channels || [body.channel || 'email'];
        const isReminder = body.reminder === true;

        // Generate a single link token for the first channel
        const result = store.generateLink(id, channels[0]);
        if (!result) {
            return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
        }

        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        const uploadUrl = `${baseUrl}/upload/${result.token}`;

        // Record link entries for each additional selected channel
        for (let i = 1; i < channels.length; i++) {
            const ch = channels[i];
            // Directly push to case.links (avoids needing addLinkEntry method)
            caseItem.links.push({
                id: `link-${Date.now()}-${i}`,
                token: result.token,
                channel: ch,
                sentAt: new Date().toISOString(),
                status: 'sent',
            });
        }

        // Build notification previews for each channel
        const notifications = channels.map(channel => ({
            channel,
            recipient: channel === 'email' ? caseItem.customerEmail : caseItem.customerPhone,
            message: isReminder
                ? `Reminder: Dear ${caseItem.customerName}, you still have pending documents. Please upload using: ${uploadUrl}`
                : `Dear ${caseItem.customerName}, please upload your pending documents using this link: ${uploadUrl}`,
            uploadUrl,
            sentAt: result.link.sentAt,
        }));

        // Add a remark for reminder
        if (isReminder) {
            store.addRemark(
                id,
                `🔔 Reminder sent via ${channels.map(c => c.toUpperCase()).join(', ')}`,
                'System'
            );
        }

        // Persist changes
        store._saveToDisk();

        return NextResponse.json({
            success: true,
            link: result.link,
            uploadUrl,
            channels,
            isReminder,
            notifications,
            notification: notifications[0], // backward compat
        });
    } catch (error) {
        console.error('Send link error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
