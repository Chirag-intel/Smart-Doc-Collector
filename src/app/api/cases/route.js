import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET() {
    const store = getStore();
    const cases = store.getAllCases();
    const stats = store.getStats();
    return NextResponse.json({ cases, stats });
}

export async function POST(request) {
    try {
        const data = await request.json();
        const store = getStore();
        const newCase = store.createCase(data);
        return NextResponse.json({ success: true, case: newCase }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
