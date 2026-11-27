// Comparaison des ventes entre deux périodes (statistiques admin).
// Les dates sont des chaînes "AAAA-MM-JJ", à l'heure de la boutique.

import { addDays } from './orderSlots.js';

export const LAUNCH_DATE = '2026-06-01'; // mise en ligne du nouveau site

const MONTH_DAYS = 365.25 / 12;

export const METRICS = [
    { value: 'ht', label: "Chiffre d'affaires HT", money: true, perMonth: true },
    { value: 'ttc', label: "Chiffre d'affaires TTC", money: true, perMonth: true },
    { value: 'count', label: 'Nombre de commandes', money: false, perMonth: true },
    { value: 'basket', label: 'Panier moyen HT', money: true, perMonth: false },
];

export const REFERENCES = [
    { value: 3, label: '3 mois précédents' },
    { value: 6, label: '6 mois précédents' },
    { value: 12, label: '12 mois précédents' },
    { value: 'lastYear', label: 'Même période un an plus tôt' },
    { value: 'custom', label: 'Dates au choix' },
];

// Commandes validées -> { days: { date: [HT, TTC, nombre] }, first }. today (journée incomplète) est exclu.
export function dailyTotals(orders, today) {
    const days = {};
    let first = null;
    for (const order of orders) {
        const date = String(order.date_add || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= today) continue;
        const day = days[date] || (days[date] = [0, 0, 0]);
        day[0] += Number(order.total_paid_tax_excl) || 0;
        day[1] += Number(order.total_paid_tax_incl) || 0;
        day[2] += 1;
        if (!first || date < first) first = date;
    }
    for (const day of Object.values(days)) {
        day[0] = Math.round(day[0] * 100) / 100;
        day[1] = Math.round(day[1] * 100) / 100;
    }
    return { days, first };
}

// Décale une date de n mois (le 31 devient le dernier jour d'un mois plus court).
export function shiftMonths(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + n, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

// Période de comparaison d'une période étudiée [from, to].
export function referencePeriod(reference, from, to) {
    if (reference === 'lastYear') return { from: shiftMonths(from, -12), to: shiftMonths(to, -12) };
    return { from: shiftMonths(from, -reference), to: addDays(from, -1) };
}

const totals = () => ({ ht: 0, ttc: 0, count: 0, nbDays: 0 });

function addDay(sum, day) {
    sum.nbDays += 1;
    if (!day) return;
    sum.ht += day[0];
    sum.ttc += day[1];
    sum.count += day[2];
}

export function summarizePeriod(days, from, to) {
    const sum = totals();
    for (let date = from; date <= to; date = addDays(date, 1)) addDay(sum, days[date]);
    return sum;
}

// Valeur d'un indicateur : total de la période, ou ramenée à un mois (perMonth).
export function metricValue(sum, metric, perMonth = false) {
    if (metric === 'basket') return sum.count ? sum.ht / sum.count : 0;
    if (!perMonth) return sum[metric];
    return sum.nbDays ? (sum[metric] / sum.nbDays) * MONTH_DAYS : 0;
}

// Totaux par semaine (du lundi) ou par mois, avec l'indication des périodes incomplètes.
export function bucketSales(days, from, to, unit) {
    const buckets = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
        const weekday = (new Date(date).getUTCDay() + 6) % 7; // 0 = lundi
        const key = unit === 'week' ? addDays(date, -weekday) : date.slice(0, 7);
        let bucket = buckets[buckets.length - 1];
        if (!bucket || bucket.key !== key) {
            bucket = { key, first: date, ...totals() };
            buckets.push(bucket);
        }
        bucket.last = date;
        addDay(bucket, days[date]);
    }
    return buckets.map(bucket => {
        let fullDays = 7;
        if (unit === 'month') {
            const [y, m] = bucket.key.split('-').map(Number);
            fullDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
        }
        return { ...bucket, partial: bucket.nbDays < fullDays };
    });
}
