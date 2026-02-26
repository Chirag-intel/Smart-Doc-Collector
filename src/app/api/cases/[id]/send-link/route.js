import { NextResponse } from 'next/server';
import { getStoreAsync } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { store, save } = await getStoreAsync();
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

        const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://smart-doc-collector.vercel.app';
        const uploadUrl = `${baseUrl}/upload/${result.token}`;

        // Record link entries for each additional selected channel
        for (let i = 1; i < channels.length; i++) {
            store.addLinkEntry(id, channels[i], result.token);
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

        const userRemark = body.remark || '';
        if (userRemark) {
            store.addRemark(id, `💬 Custom Remark: ${userRemark}`, 'Agent');
        }

        if (isReminder) {
            store.addRemark(
                id,
                `🔔 Reminder sent via ${channels.map(c => c.toUpperCase()).join(', ')}`,
                'System'
            );
        } else {
            store.addRemark(
                id,
                `🔗 Upload link sent via ${channels.map(c => c.toUpperCase()).join(', ')}`,
                'System'
            );
        }

        // Persist everything atomically
        await save();

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
