// Chiffre d'affaires HT avant / après la mise en ligne du nouveau site (statistiques admin).
// Les dates sont des chaînes "AAAA-MM-JJ", à l'heure de la boutique.
// Comparaison en HT : la TVA des fleurs est passée à 20 % en juillet 2026, le TTC fausserait l'écart.

export const LAUNCH_DATE = '2026-06-01';
export const BEFORE_FROM = '2025-12-01'; // six mois de référence avant la mise en ligne

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 365.25 / 12;

// orders : commandes validées [{ date_add, total_paid_tax_excl }] ; today (journée incomplète) est exclu.
export function compareRevenue(orders, today) {
    const before = { from: BEFORE_FROM, total: 0, count: 0 };
    const after = { from: LAUNCH_DATE, total: 0, count: 0 };
    const months = {};

    for (const order of orders) {
        const date = String(order.date_add || '').slice(0, 10);
        if (date < BEFORE_FROM || date >= today) continue;
        const amount = Number(order.total_paid_tax_excl) || 0;
        const period = date < LAUNCH_DATE ? before : after;
        period.total += amount;
        period.count += 1;
        const month = date.slice(0, 7);
        months[month] = (months[month] || 0) + amount;
    }

    const finish = (period, end) => {
        const nbDays = Math.max(0, Math.round((Date.parse(end) - Date.parse(period.from)) / DAY_MS));
        return {
            from: period.from,
            to: new Date(Date.parse(end) - DAY_MS).toISOString().slice(0, 10),
            total: Math.round(period.total),
            count: period.count,
            perMonth: nbDays ? Math.round((period.total / nbDays) * MONTH_DAYS) : 0,
            basket: period.count ? Math.round(period.total / period.count) : 0,
        };
    };

    return {
        before: finish(before, LAUNCH_DATE),
        after: finish(after, today),
        months: Object.keys(months).sort().map(key => ({
            key,
            total: Math.round(months[key]),
            after: key >= LAUNCH_DATE.slice(0, 7),
            partial: key === today.slice(0, 7),
        })),
    };
}
