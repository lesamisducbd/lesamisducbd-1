// Répartition des commandes par jour de semaine et par heure (aide au choix d'un créneau de maintenance).

export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const WINDOW_HOURS = 3;
const FIRST_HOUR = 8;
const LAST_HOUR = 19;
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

    if (parsed.length === 0) return { total: 0, from: null, to: null, grid, quietest: [] };

    const times = parsed.map(o => o.time);
    const from = Math.min(...times);
    const to = Math.max(...times);
    // Nombre de semaines couvertes, pour donner une moyenne par créneau.
    const weeks = Math.max(1, (to - from + DAY_MS) / (7 * DAY_MS));

    // Pour chaque jour : la fenêtre de 3 h la plus calme en journée (8h-19h).
    const quietest = grid.map((hours, day) => {
        let best = null;
        for (let start = FIRST_HOUR; start + WINDOW_HOURS <= LAST_HOUR; start++) {
            const count = hours.slice(start, start + WINDOW_HOURS).reduce((a, b) => a + b, 0);
            if (!best || count < best.count) best = { day, start, end: start + WINDOW_HOURS, count };
        }
        return { ...best, average: Math.round((best.count / weeks) * 10) / 10 };
    }).sort((a, b) => a.count - b.count);

    const iso = time => new Date(time).toISOString().slice(0, 10);
    return { total: parsed.length, from: iso(from), to: iso(to), grid, quietest };
}
