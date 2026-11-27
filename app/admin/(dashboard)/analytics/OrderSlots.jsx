'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { DAY_LABELS, addDays, bucketOrders, rankSlots, shopToday, summarize } from '@/lib/utils/orderSlots';
import styles from './Analytics.module.css';

const frDate = iso => iso.split('-').reverse().join('/');
const frNumber = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

const HOURS = Array.from({ length: 24 }, (_, h) => h);

const SORTS = [
    { value: 'quiet', label: 'Les plus calmes' },
    { value: 'busy', label: 'Les plus chargés' },
];

const MOMENTS = [
    { value: 'day', label: 'Journée (8h-19h)', firstHour: 8, lastHour: 19 },
    { value: 'morning', label: 'Tôt le matin (5h-10h)', firstHour: 5, lastHour: 10 },
    { value: 'evening', label: 'Soir (18h-minuit)', firstHour: 18, lastHour: 24 },
    { value: 'night', label: 'Nuit (0h-6h)', firstHour: 0, lastHour: 6 },
    { value: 'all', label: '24h/24', firstHour: 0, lastHour: 24 },
];

const DURATIONS = [1, 2, 3, 4].map(h => ({ value: h, label: `${h} h` }));

const PERIODS = [
    { value: 28, label: '4 semaines' },
    { value: 91, label: '3 mois' },
    { value: 182, label: '6 mois' },
    { value: 365, label: '12 mois' },
    { value: 'custom', label: 'Dates au choix' },
];

const UNITS = [
    { value: 'day', label: 'Par jour' },
    { value: 'week', label: 'Par semaine' },
    { value: 'month', label: 'Par mois' },
];

const TABS = [
    { value: 'slots', label: 'Trouver un créneau' },
    { value: 'trend', label: 'Évolution' },
    { value: 'hours', label: 'Détail par heure' },
];

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function bucketLabel(key, unit) {
    const [y, m, d] = key.split('-');
    if (unit === 'month') return `${MONTHS[m - 1]} ${y.slice(2)}`;
    return `${d}/${m}`;
}

function Evolution({ buckets, unit }) {
    const scroller = useRef(null);
    const max = Math.max(1, ...buckets.map(b => b.count));

    // Les périodes les plus récentes sont à droite : on s'y place.
    useEffect(() => {
        if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
    }, [buckets]);

    return (
        <div className={styles.bars} ref={scroller}>
            {buckets.map(bucket => (
                <div
                    key={bucket.key}
                    className={styles.barColumn}
                    title={`${unit === 'week' ? 'Semaine du ' : ''}${bucketLabel(bucket.key, unit)} : ${bucket.count} commande(s)${bucket.partial ? ' (période incomplète)' : ''}`}
                >
                    <span className={styles.barValue}>{bucket.count}</span>
                    <span className={styles.barTrack}>
                        <span
                            className={`${styles.bar} ${bucket.partial ? styles.barPartial : ''}`}
                            style={{ height: `${(bucket.count / max) * 100}%` }}
                        />
                    </span>
                    <span className={styles.barLabel}>{bucketLabel(bucket.key, unit)}</span>
                </div>
            ))}
        </div>
    );
}

// Menu déroulant. La valeur d'origine (texte ou nombre) est rendue à onChange.
export function Filter({ label, options, value, onChange }) {
    return (
        <label className={styles.filterField}>
            <span className={styles.filterLabel}>{label}</span>
            <select
                className={styles.select}
                value={value}
                onChange={e => onChange(options.find(o => String(o.value) === e.target.value).value)}
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </label>
    );
}

export default function OrderSlots() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    // Filtres appliqués dans le navigateur : aucun appel supplémentaire.
    const [sort, setSort] = useState('quiet');
    const [moment, setMoment] = useState('day');
    const [duration, setDuration] = useState(3);
    const [period, setPeriod] = useState(182);
    const [custom, setCustom] = useState({ from: '', to: '' });
    const [unit, setUnit] = useState('week');
    const [tab, setTab] = useState('slots');

    // Chargé une seule fois à l'ouverture : hors du rafraîchissement automatique de la page.
    useEffect(() => {
        fetch('/api/admin/orders-by-hour')
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    // Période choisie, limitée aux données disponibles. Les périodes prédéfinies s'arrêtent à hier
    // (la journée en cours est incomplète).
    const today = shopToday();
    const hasData = Boolean(data && data.first);
    let from = null;
    let to = null;
    if (hasData) {
        const clamp = date => (date < data.first ? data.first : date > today ? today : date);
        if (period === 'custom') {
            from = clamp(custom.from || addDays(today, -28));
            to = clamp(custom.to || today);
            if (from > to) [from, to] = [to, from];
        } else {
            to = clamp(addDays(today, -1));
            from = clamp(addDays(to, 1 - period));
        }
    }
    const stats = hasData ? summarize(data.days, from, to) : null;
    const max = stats ? Math.max(1, ...stats.grid.flat()) : 1;
    const shortened = hasData && period !== 'custom' && stats.nbDays < period;
    const slots = stats
        ? rankSlots(stats.grid, stats.dayCounts, { ...MOMENTS.find(m => m.value === moment), duration, busiest: sort === 'busy' })
        : [];

    const summary = stats ? [
        { label: 'commandes', value: stats.total },
        { label: 'par jour', value: stats.total / stats.nbDays },
        stats.nbDays >= 7 && { label: 'par semaine', value: (stats.total / stats.nbDays) * 7 },
        stats.nbDays >= 30 && { label: 'par mois', value: (stats.total / stats.nbDays) * (365 / 12) },
    ].filter(Boolean) : [];

    return (
        <div className={styles.sectionBlock}>
            <div className={styles.ordersHeader}>
                <div>
                    <h2 className={`${styles.sectionTitle} ${styles.slotsTitle}`}>
                        <Clock size={18} /> Commandes par tranche horaire
                    </h2>
                    {stats && (
                        <p className={styles.periodNote}>
                            Du {frDate(from)} au {frDate(to)} · {frNumber(stats.nbDays)} jour{stats.nbDays > 1 ? 's' : ''} · tous statuts, heure de la boutique
                            {shortened && ' · historique disponible limité'}
                        </p>
                    )}
                </div>
                {stats && (
                    <div className={styles.filterRow}>
                        <Filter label="Période" options={PERIODS} value={period} onChange={setPeriod} />
                        {period === 'custom' && (
                            <>
                                <label className={styles.filterField}>
                                    <span className={styles.filterLabel}>Du</span>
                                    <input className={styles.select} type="date" min={data.first} max={today} value={from} onChange={e => setCustom({ from: e.target.value, to })} />
                                </label>
                                <label className={styles.filterField}>
                                    <span className={styles.filterLabel}>Au</span>
                                    <input className={styles.select} type="date" min={data.first} max={today} value={to} onChange={e => setCustom({ from, to: e.target.value })} />
                                </label>
                            </>
                        )}
                    </div>
                )}
            </div>

            {failed && <p className={styles.subtitle}>Commandes indisponibles pour le moment.</p>}
            {!failed && !data && <p className={styles.subtitle}>Chargement des commandes...</p>}
            {data && !hasData && <p className={styles.subtitle}>Aucune commande trouvée.</p>}

            {stats && (
                <>
                    <ul className={styles.summaryList}>
                        {summary.map(item => (
                            <li key={item.label} className={styles.summaryCard}>
                                <strong>{frNumber(item.value)}</strong>
                                <span>{item.label}</span>
                            </li>
                        ))}
                    </ul>

                    <div className={styles.tabs} role="tablist">
                        {TABS.map(t => (
                            <button
                                key={t.value}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.value}
                                className={`${styles.tab} ${tab === t.value ? styles.tabActive : ''}`}
                                onClick={() => setTab(t.value)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'slots' && (
                        <div role="tabpanel">
                            <div className={styles.filterRow}>
                                <Filter label="Afficher" options={SORTS} value={sort} onChange={setSort} />
                                <Filter label="Moment" options={MOMENTS} value={moment} onChange={setMoment} />
                                <Filter label="Durée" options={DURATIONS} value={duration} onChange={setDuration} />
                            </div>
                            <ol className={styles.slotCards}>
                                {slots.map((slot, i) => (
                                    <li key={slot.day} className={`${styles.slotCard} ${i === 0 ? styles.slotCardFirst : ''}`}>
                                        <span className={styles.slotRank}>n° {i + 1}</span>
                                        <strong className={styles.slotDay}>{DAY_LABELS[slot.day]}</strong>
                                        <span className={styles.slotHours}>{slot.start}h à {slot.end}h</span>
                                        <span className={styles.slotAverage}>
                                            <strong>{frNumber(slot.average)}</strong> commande{slot.average >= 2 ? 's' : ''} en moyenne
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {tab === 'trend' && (
                        <div role="tabpanel">
                            <div className={styles.filterRow}>
                                <Filter label="Afficher" options={UNITS} value={unit} onChange={setUnit} />
                            </div>
                            <Evolution buckets={bucketOrders(data.days, from, to, unit)} unit={unit} />
                            {unit !== 'day' && <p className={styles.slotsHelp}>Barre claire : période incomplète.</p>}
                        </div>
                    )}

                    {tab === 'hours' && (
                        <div role="tabpanel">
                            <p className={styles.slotsHelp}>Nombre total de commandes sur la période. Plus c&apos;est vert, plus il y en a.</p>
                            <div className={styles.slotsScroll}>
                                <table className={styles.slotsTable}>
                                    <thead>
                                        <tr>
                                            <th></th>
                                            {HOURS.map(h => <th key={h}>{h}h</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.grid.map((day, d) => (
                                            <tr key={DAY_LABELS[d]}>
                                                <th>{DAY_LABELS[d].slice(0, 3)}</th>
                                                {HOURS.map(h => (
                                                    <td
                                                        key={h}
                                                        title={`${DAY_LABELS[d]} ${h}h-${h + 1}h : ${day[h]} commande(s)`}
                                                        style={{ background: `rgba(5, 150, 105, ${(day[h] / max) * 0.65})` }}
                                                    >
                                                        {day[h]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
