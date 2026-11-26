// Répartition des commandes par jour de semaine et par heure (aide au choix d'un créneau de maintenance).

export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const DAY_MS = 24 * 60 * 60 * 1000;

// date_add PrestaShop : "AAAA-MM-JJ HH:MM:SS", heure de la boutique (aucune conversion de fuseau).
function parseDate(dateAdd) {
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):/.exec(dateAdd || '');
    if (!match) return null;
    const [, y, m, d, h] = match.map(Number);
    const time = Date.UTC(y, m - 1, d);
    return { time, day: (new Date(time).getUTCDay() + 6) % 7, hour: h };
}

export function computeOrderSlots(dates, { periodDays = 180, now = Date.now() } = {}) {
    const parsed = dates.map(parseDate).filter(o => o && o.time >= now - periodDays * DAY_MS);
    const grid = DAY_LABELS.map(() => Array(24).fill(0));
    parsed.forEach(o => { grid[o.day][o.hour] += 1; });

    if (parsed.length === 0) return { total: 0, from: null, to: null, grid };

    const times = parsed.map(o => o.time);
    const iso = time => new Date(time).toISOString().slice(0, 10);
    return { total: parsed.length, from: iso(Math.min(...times)), to: iso(Math.max(...times)), grid };
}

// Nombre de semaines couvertes par la période, pour passer d'un total à une moyenne.
export function countWeeks(from, to) {
    return Math.max(1, (Date.parse(to) - Date.parse(from) + DAY_MS) / (7 * DAY_MS));
}

const WINDOW_HOURS = 3;

// Pour chaque jour, la meilleure fenêtre de 3 h entre firstHour et lastHour ; renvoie les 3 premiers jours.
// busiest = false : les plus calmes ; true : les plus chargées.
export function rankSlots(grid, weeks, { firstHour, lastHour, busiest = false }) {
    const better = (a, b) => (busiest ? b - a : a - b);
    return grid.map((hours, day) => {
        let best = null;
        for (let start = firstHour; start + WINDOW_HOURS <= lastHour; start++) {
            const count = hours.slice(start, start + WINDOW_HOURS).reduce((a, b) => a + b, 0);
            if (!best || better(count, best.count) < 0) best = { day, start, end: start + WINDOW_HOURS, count };
        }
        return { ...best, average: Math.round((best.count / weeks) * 10) / 10 };
    }).sort((a, b) => better(a.count, b.count)).slice(0, 3);
}
