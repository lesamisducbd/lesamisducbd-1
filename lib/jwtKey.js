// Clé de signature des sessions admin, partagée entre lib/auth.js et middleware.js (compatible Edge).
// Aucune valeur de repli : sans JWT_SECRET, aucun jeton n'est émis ni accepté.
export function getJwtKey() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET manquant : authentification admin désactivée.');
    }
    return new TextEncoder().encode(secret);
}
