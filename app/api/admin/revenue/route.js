import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { safeKvGet, safeKvSet } from '@/lib/kvCache';
import { shopToday } from '@/lib/utils/orderSlots';
import { dailyTotals } from '@/lib/utils/revenue';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'analytics:revenue_v2';
// Comme les commandes par heure : un seul appel PrestaShop toutes les 12 h au maximum.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MEMORY_TTL_MS = 60 * 60 * 1000;
const PAGE_SIZE = 2000;

async function fetchValidOrders() {
    const url = process.env.PRESTASHOP_API_URL;
    const key = process.env.PRESTASHOP_API_KEY;
    const orders = [];
    // Tout l'historique, par lots.
    for (let offset = 0; ; offset += PAGE_SIZE) {
        const res = await fetch(
            `${url}/orders?display=[date_add,total_paid_tax_excl,total_paid_tax_incl,valid]&sort=[id_ASC]&limit=${offset},${PAGE_SIZE}&output_format=JSON&ws_key=${key}`,
            { cache: 'no-store', signal: AbortSignal.timeout(15000) }
        );
        if (!res.ok) throw new Error(`PrestaShop ${res.status}`);
        const page = (await res.json()).orders || [];
        orders.push(...page.filter(order => String(order.valid) === '1'));
        if (page.length < PAGE_SIZE) return orders;
    }
}

export async function GET() {
    if (!(await getSession())) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const cached = await safeKvGet(CACHE_KEY, null, MEMORY_TTL_MS);
    if (cached && Date.now() - cached.computedAt < MAX_AGE_MS) {
        return NextResponse.json(cached);
    }

    try {
        const result = { ...dailyTotals(await fetchValidOrders(), shopToday()), computedAt: Date.now() };
        await safeKvSet(CACHE_KEY, result, MEMORY_TTL_MS);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Revenue API error:', error.message);
        // Boutique injoignable (maintenance) : on garde le dernier relevé.
        if (cached) return NextResponse.json(cached);
        return NextResponse.json({ error: "Chiffre d'affaires indisponible" }, { status: 502 });
    }
}
