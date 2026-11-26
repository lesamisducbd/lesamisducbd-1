import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getSession } from '@/lib/auth';
import { recordAdminAction, getClientIp } from '@/lib/auditLog';
import { MAINTENANCE_KEY } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

// kv direct (et non safeKvSet) : une écriture en échec doit remonter à l'admin.
async function requireSuperadmin() {
    const session = await getSession();
    return session?.role === 'superadmin' ? session : null;
}

export async function GET() {
    if (!(await requireSuperadmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const state = await kv.get(MAINTENANCE_KEY);
        return NextResponse.json(state || { enabled: false });
    } catch (error) {
        console.error('Maintenance API GET error:', error.message);
        return NextResponse.json({ error: "Impossible de lire l'état du site" }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await requireSuperadmin();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { enabled } = await request.json();
        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const state = { enabled, updatedAt: new Date().toISOString(), updatedBy: session.username };
        await kv.set(MAINTENANCE_KEY, state);

        await recordAdminAction({
            username: session.username,
            action: enabled ? 'Maintenance activée' : 'Maintenance désactivée',
            target: 'Site public',
            ip: getClientIp(request)
        });

        return NextResponse.json(state);
    } catch (error) {
        console.error('Maintenance API POST error:', error.message);
        return NextResponse.json({ error: "L'état du site n'a pas pu être modifié" }, { status: 500 });
    }
}
