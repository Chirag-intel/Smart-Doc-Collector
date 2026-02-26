import { NextResponse } from 'next/server';
import { getStoreAsync } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    const { id } = await params;
    const { store } = await getStoreAsync();
    const caseItem = store.getCaseById(id);
    if (!caseItem) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    return NextResponse.json({ case: caseItem });
}
