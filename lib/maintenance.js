// Mode maintenance : état partagé entre le middleware (runtime Edge) et l'API admin.
// Pas de safeKvGet ici : lib/kvCache.js utilise `fs`, indisponible dans le middleware.
import { kv } from '@vercel/kv';

export const MAINTENANCE_KEY = 'maintenance_mode';
const CACHE_TTL_MS = 15 * 1000; // délai maximal de propagation, et quota KV préservé

let cache = { enabled: false, expiresAt: 0 };

/** Lecture mise en cache. En cas de panne KV, conserve le dernier état connu (site ouvert par défaut). */
export async function isMaintenanceEnabled() {
    const now = Date.now();
    if (now < cache.expiresAt) return cache.enabled;
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return false;

    try {
        const state = await kv.get(MAINTENANCE_KEY);
        cache = { enabled: Boolean(state?.enabled), expiresAt: now + CACHE_TTL_MS };
    } catch (error) {
        console.error('[Maintenance] Lecture KV impossible :', error.message);
        cache = { enabled: cache.enabled, expiresAt: now + CACHE_TTL_MS };
    }
    return cache.enabled;
}
