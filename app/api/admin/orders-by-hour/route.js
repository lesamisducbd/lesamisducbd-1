import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { safeKvGet, safeKvSet } from '@/lib/kvCache';
import { addDays, groupOrdersByDay, shopToday } from '@/lib/utils/orderSlots';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'analytics:orders_by_day_v2';
// Un seul appel PrestaShop et une seule écriture KV toutes les 12 h au maximum.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MEMORY_TTL_MS = 60 * 60 * 1000;
const MAX_ORDERS = 5000;
const HISTORY_DAYS = 400;

export async function GET() {
    if (!(await getSession())) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const cached = await safeKvGet(CACHE_KEY, null, MEMORY_TTL_MS);
    if (cached && Date.now() - cached.computedAt < MAX_AGE_MS) {
        return NextResponse.json(cached);
    }

    try {
        const url = process.env.PRESTASHOP_API_URL;
        const key = process.env.PRESTASHOP_API_KEY;
        const res = await fetch(
            `${url}/orders?display=[date_add]&sort=[id_DESC]&limit=${MAX_ORDERS}&output_format=JSON&ws_key=${key}`,
            { cache: 'no-store', signal: AbortSignal.timeout(15000) }
        );
        if (!res.ok) throw new Error(`PrestaShop ${res.status}`);
        const data = await res.json();
        const dates = (data.orders || []).map(order => order.date_add);

        const result = {
            ...groupOrdersByDay(dates, {
                since: addDays(shopToday(), -HISTORY_DAYS),
                truncated: dates.length === MAX_ORDERS,
            }),
            computedAt: Date.now(),
        };
        await safeKvSet(CACHE_KEY, result, MEMORY_TTL_MS);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Orders by hour API error:', error.message);
        // Boutique injoignable (maintenance) : on garde le dernier relevé.
        if (cached) return NextResponse.json(cached);
        return NextResponse.json({ error: 'Commandes indisponibles' }, { status: 502 });
    }
}
