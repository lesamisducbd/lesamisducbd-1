// Répartition des commandes par jour et par heure (statistiques et choix d'un créneau de maintenance).
// Toutes les dates sont des chaînes "AAAA-MM-JJ", à l'heure de la boutique.

export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY_MS).toISOString().slice(0, 10);
const weekday = iso => (new Date(iso).getUTCDay() + 6) % 7; // 0 = lundi

export const shopToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

// date_add PrestaShop : "AAAA-MM-JJ HH:MM:SS" (aucune conversion de fuseau).
// Renvoie { days: { date: [24 compteurs] }, first } ; les jours sans commande sont absents.
export function groupOrdersByDay(dateAdds, { since, truncated = false }) {
    const parsed = dateAdds
        .map(value => /^(\d{4}-\d{2}-\d{2}) (\d{2}):/.exec(value || ''))
        .filter(Boolean)
        .map(m => ({ date: m[1], hour: Number(m[2]) }));
    if (parsed.length === 0) return { days: {}, first: null };

    const oldest = parsed.reduce((min, o) => (o.date < min ? o.date : min), parsed[0].date);
    // Si la liste est coupée par la limite, le jour le plus ancien est incomplet : on l'écarte.
    const start = truncated ? addDays(oldest, 1) : oldest;
    const first = start > since ? start : since;

    const days = {};
    for (const { date, hour } of parsed) {
        if (date < first) continue;
        if (!days[date]) days[date] = Array(24).fill(0);
        days[date][hour] += 1;
    }
    return { days, first };
}

// Totaux sur la période [from, to] : grille jour de semaine x heure et nombre de chaque jour de semaine.
export function summarize(days, from, to) {
    const grid = DAY_LABELS.map(() => Array(24).fill(0));
    const dayCounts = Array(7).fill(0);
    let total = 0;
    let nbDays = 0;
    for (let date = from; date <= to; date = addDays(date, 1)) {
        const d = weekday(date);
        dayCounts[d] += 1;
        nbDays += 1;
        (days[date] || []).forEach((count, hour) => {
            grid[d][hour] += count;
            total += count;
        });
    }
    return { grid, dayCounts, nbDays, total };
}

// Nombre de commandes par jour, par semaine (du lundi) ou par mois.
export function bucketOrders(days, from, to, unit) {
    const buckets = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
        const key = unit === 'day' ? date : unit === 'week' ? addDays(date, -weekday(date)) : date.slice(0, 7);
        let bucket = buckets[buckets.length - 1];
        if (!bucket || bucket.key !== key) {
            bucket = { key, count: 0, nbDays: 0 };
            buckets.push(bucket);
        }
        bucket.nbDays += 1;
        bucket.count += (days[date] || []).reduce((a, b) => a + b, 0);
    }
    return buckets.map(bucket => {
        let fullDays = 1;
        if (unit === 'week') fullDays = 7;
        if (unit === 'month') {
            const [y, m] = bucket.key.split('-').map(Number);
            fullDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
        }
        return { ...bucket, partial: bucket.nbDays < fullDays };
    });
}

// Pour chaque jour de semaine, la meilleure fenêtre de `duration` heures entre firstHour et lastHour ;
// renvoie les 3 premiers jours. busiest = false : les plus calmes ; true : les plus chargés.
export function rankSlots(grid, dayCounts, { firstHour, lastHour, duration = 3, busiest = false }) {
    const better = (a, b) => (busiest ? b - a : a - b);
    return grid.map((hours, day) => {
        if (!dayCounts[day]) return null; // jour absent de la période choisie
        let best = null;
        for (let start = firstHour; start + duration <= lastHour; start++) {
            const count = hours.slice(start, start + duration).reduce((a, b) => a + b, 0);
            if (!best || better(count, best.count) < 0) best = { day, start, end: start + duration, count };
        }
        return { ...best, average: best.count / dayCounts[day] };
    })
        .filter(Boolean)
        .sort((a, b) => better(a.average, b.average))
        .slice(0, 3);
}
