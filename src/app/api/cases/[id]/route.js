import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET(request, { params }) {
    const { id } = await params;
    const store = getStore();
    const caseItem = store.getCaseById(id);
    if (!caseItem) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    return NextResponse.json({ case: caseItem });
}
