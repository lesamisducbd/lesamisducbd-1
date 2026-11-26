import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { publishKvWrite } from '@/lib/kvCache';

const PAGE_KEY = 'content:usages';

export async function GET() {
    try {
        const data = await kv.get(PAGE_KEY) || {};
        return NextResponse.json(data);
    } catch (error) {
        console.error(`[API] Erreur GET ${PAGE_KEY}:`, error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        // Tout compte admin connecté (editor ou superadmin)
        if (!(await getSession())) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const body = await req.json();

        // Retrieve existing and merge
        const existingData = await kv.get(PAGE_KEY) || {};
        const mergedData = { ...existingData, ...body };

        // Save
        await kv.set(PAGE_KEY, mergedData);
        publishKvWrite(PAGE_KEY, mergedData);

        return NextResponse.json({ success: true, data: mergedData });
    } catch (error) {
        console.error(`[API] Erreur POST ${PAGE_KEY}:`, error);
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}
