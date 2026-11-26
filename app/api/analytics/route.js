import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function POST(req) {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return NextResponse.json({ success: true, skipped: true });
    }

    try {
        const body = await req.json();
        const { type, page, device, referrer, duration, ctaId, visitorId } = body;
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `analytics:daily:${today}`;
        const totalsKey = 'analytics:totals';

        const pipeline = kv.pipeline();

        if (type === 'view' && page) {
            // Increment total views
            pipeline.hincrby(totalsKey, `views:${page}`, 1);
            // Increment daily views
            pipeline.hincrby(dailyKey, `views:${page}`, 1);
            
            // Visiteurs uniques : HyperLogLog (taille fixe, compte approché à environ 1 %).
            // Le navigateur n'envoie l'identifiant qu'une fois par jour.
            if (typeof visitorId === 'string' && /^[0-9a-f-]{36}$/i.test(visitorId)) {
                const visitorsKey = `analytics:visitors:${today}`;
                pipeline.pfadd('analytics:visitors:total', visitorId);
                pipeline.pfadd(visitorsKey, visitorId);
                pipeline.expire(visitorsKey, 400 * 24 * 60 * 60);
                pipeline.set('analytics:visitors:since', today, { nx: true });
            }

            // Increment device stats
            if (device) {
                pipeline.hincrby(totalsKey, `device:${device}`, 1);
            }
            
            // Increment referrer stats (exclude own domain and localhost)
            if (referrer && referrer !== 'direct') {
                let cleanRef = referrer.replace('www.', '').toLowerCase();
                const ignoredDomains = ['localhost', '127.0.0.1', 'lesamisducbd.fr'];
                
                // Check if cleanRef includes any of the ignored domains
                const isIgnored = ignoredDomains.some(domain => cleanRef.includes(domain));
                
                if (!isIgnored) {
                    pipeline.hincrby(totalsKey, `referrer:${cleanRef}`, 1);
                }
            }
        } 
        else if (type === 'time' && page && duration) {
            // Increment total time spent and number of sessions with tracked time
            pipeline.hincrby(totalsKey, `time:${page}`, duration);
            pipeline.hincrby(totalsKey, `sessions:${page}`, 1);
        }
        else if (type === 'cta' && ctaId) {
            pipeline.hincrby(totalsKey, `cta:${ctaId}`, 1);
            pipeline.hincrby(dailyKey, `cta:${ctaId}`, 1);
        }

        await pipeline.exec();
        
        return NextResponse.json({ success: true });
    } catch (error) {
        // Silently skip if KV quota reached so visitor experience is unaffected
        return NextResponse.json({ success: false, skipped: true });
    }
}
