import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { jwtVerify } from 'jose';
import { getJwtKey } from '@/lib/jwtKey';
import { isMaintenanceEnabled } from '@/lib/maintenance';
import { MAINTENANCE_HTML } from '@/lib/maintenancePage';

const nextAuthMiddleware = withAuth(
    function middleware(req) {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        },
        pages: {
            signIn: '/connexion',
        },
    }
);

// Restent accessibles en maintenance : le back-office et sa connexion.
// (/api/auth/login et logout sont ceux de l'admin ; les clients passent par NextAuth.)
function isMaintenanceExempt(pathname) {
    return pathname === '/admin' || pathname.startsWith('/admin/')
        || pathname.startsWith('/api/admin/')
        || pathname === '/api/auth/login' || pathname === '/api/auth/logout'
        || pathname === '/robots.txt';
}

async function hasAdminToken(req) {
    const token = req.cookies.get('admin_token')?.value;
    if (!token) return false;
    try {
        await jwtVerify(token, getJwtKey(), { algorithms: ['HS256'] });
        return true;
    } catch {
        return false;
    }
}

function maintenanceResponse(pathname) {
    const headers = { 'Cache-Control': 'no-store', 'Retry-After': '3600' };

    if (pathname.startsWith('/api/')) {
        const message = 'Site en maintenance, veuillez réessayer plus tard.';
        return NextResponse.json({ success: false, message, error: message }, { status: 503, headers });
    }

    return new NextResponse(MAINTENANCE_HTML, {
        status: 503,
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
    });
}

export default async function middleware(req) {
    const { pathname, searchParams } = req.nextUrl;
    
    // Mode maintenance : les administrateurs connectés gardent l'accès au site.
    if (!isMaintenanceExempt(pathname) && await isMaintenanceEnabled() && !(await hasAdminToken(req))) {
        return maintenanceResponse(pathname);
    }

    // We create a base response object. Next.js middleware allows returning this or modifying it.
    let response = NextResponse.next();

    // 0. Catch Sponsorship Parameter (Tracking)
    const sponsorship = searchParams.get('sponsorship');
    if (sponsorship) {
        // Set a cookie for 30 days
        response.cookies.set({
            name: 'sponsorship_code',
            value: sponsorship,
            path: '/',
            maxAge: 60 * 60 * 24 * 30, 
            httpOnly: true, // Secure, not readable via JS
            secure: process.env.NODE_ENV === 'production'
        });
    }

    // 1. Admin Routes Protection
    if (pathname.startsWith('/admin')) {
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        const token = req.cookies.get('admin_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }

        try {
            const { payload } = await jwtVerify(token, getJwtKey(), { algorithms: ['HS256'] });
            
            // Check for superadmin routes
            if (pathname.startsWith('/admin/users')) {
                if (payload.role !== 'superadmin') {
                    // Redirect non-superadmins back to the main dashboard
                    return NextResponse.redirect(new URL('/admin/content', req.url));
                }
            }
            
            return NextResponse.next();
        } catch (e) {
            console.error('Middleware Admin JWT Error:', e.message);
            const response = NextResponse.redirect(new URL('/admin/login', req.url));
            response.cookies.delete('admin_token');
            return response;
        }
    }

    // 2. Client Routes Protection (NextAuth)
    if (pathname.startsWith('/account') || pathname.startsWith('/checkout')) {
        return nextAuthMiddleware(req, Object.assign({}));
    }

    return response;
}

export const config = {
    // Toutes les pages et API (necessaire au mode maintenance), hors fichiers statiques.
    // Les pages publiques restent servies par le cache CDN apres le passage du middleware.
    matcher: [
        "/((?!_next/static|_next/image|images/|icons/|.*\\.(?:png|jpe?g|webp|avif|svg|ico|css|js|woff2?|geojson)$).*)"
    ]
};
