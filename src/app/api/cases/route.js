import { NextResponse } from 'next/server';
import { getStoreAsync } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { store } = await getStoreAsync();
    const cases = store.getAllCases();
    const stats = store.getStats();
    return NextResponse.json({ cases, stats });
}

export async function POST(request) {
    try {
        const data = await request.json();
        const { store, save } = await getStoreAsync();
        const newCase = store.createCase(data);
        await save();
        return NextResponse.json({ success: true, case: newCase }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
