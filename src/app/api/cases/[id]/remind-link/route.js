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

        const { token } = body;

        let targetLink = null;
        if (token) {
            // Find the link history items matching this token
            targetLink = caseItem.links.find(l => l.token === token);
        }

        if (!targetLink) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        // Just find all channels that were used for this token
        const relatedLinks = caseItem.links.filter(l => l.token === token);
        const channels = relatedLinks.map(l => l.channel);

        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        const uploadUrl = `${baseUrl}/upload/${token}`;

        // Create notification payloads
        const notifications = channels.map(channel => ({
            channel,
            recipient: channel === 'email' ? caseItem.customerEmail : caseItem.customerPhone,
            message: `Reminder: Dear ${caseItem.customerName}, you still have pending documents. Please upload using your existing link: ${uploadUrl}`,
            uploadUrl,
            sentAt: new Date().toISOString(),
        }));

        store.addRemark(
            id,
            `🔔 Reminder sent via ${channels.map(c => c.toUpperCase()).join(', ')} for retriggered link.`,
            'System'
        );

        // Update the sentAt timestamp of those links to reflect the reminder
        relatedLinks.forEach(l => {
            l.sentAt = new Date().toISOString();
        });

        store._saveToDisk();

        return NextResponse.json({
            success: true,
            uploadUrl,
            channels,
            notifications,
        });

    } catch (error) {
        console.error('Remind link error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
