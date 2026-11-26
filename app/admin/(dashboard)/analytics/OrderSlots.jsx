'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { DAY_LABELS, countWeeks, rankSlots } from '@/lib/utils/orderSlots';
import styles from './Analytics.module.css';

const frDate = iso => iso.split('-').reverse().join('/');
const frNumber = n => n.toLocaleString('fr-FR');

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

function Filter({ label, options, value, onChange }) {
    return (
        <div className={styles.filterRow} role="group" aria-label={label}>
            <span className={styles.filterLabel}>{label}</span>
            {options.map(option => (
                <button
                    key={option.value}
                    type="button"
                    className={`${styles.chip} ${option.value === value ? styles.chipActive : ''}`}
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default function OrderSlots() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    // Filtres appliqués dans le navigateur : aucun appel supplémentaire.
    const [sort, setSort] = useState('quiet');
    const [moment, setMoment] = useState('day');
    const [duration, setDuration] = useState(3);

    // Chargé une seule fois à l'ouverture : hors du rafraîchissement automatique de la page.
    useEffect(() => {
        fetch('/api/admin/orders-by-hour')
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    const max = data ? Math.max(1, ...data.grid.flat()) : 1;
    const weeks = data && data.total > 0 ? countWeeks(data.from, data.to) : 1;
    const slots = data && data.total > 0
        ? rankSlots(data.grid, weeks, { ...MOMENTS.find(m => m.value === moment), duration, busiest: sort === 'busy' })
        : [];

    return (
        <div className={styles.sectionBlock}>
            <h2 className={`${styles.sectionTitle} ${styles.slotsTitle}`}>
                <Clock size={18} /> Commandes par tranche horaire
            </h2>

            {failed && <p className={styles.subtitle}>Commandes indisponibles pour le moment.</p>}
            {!failed && !data && <p className={styles.subtitle}>Chargement des commandes...</p>}
            {data && data.total === 0 && <p className={styles.subtitle}>Aucune commande sur la période.</p>}

            {data && data.total > 0 && (
                <>
                    <p className={styles.subtitle}>
                        {frNumber(data.total)} commandes du {frDate(data.from)} au {frDate(data.to)}, soit environ {Math.round(weeks)} semaines (heure de la boutique).
                    </p>

                    <h3 className={styles.slotsSubtitle}>Total sur toute la période</h3>
                    <p className={styles.slotsHelp}>
                        Chaque case additionne les commandes reçues ce jour-là pendant cette heure, sur toute la période (ce n&apos;est pas une moyenne). Plus la case est verte, plus il y en a eu.
                    </p>

                    <div className={styles.slotsScroll}>
                        <table className={styles.slotsTable}>
                            <thead>
                                <tr>
                                    <th></th>
                                    {HOURS.map(h => <th key={h}>{h}h</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.grid.map((day, d) => (
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

                    <h3 className={styles.slotsSubtitle}>Trouver un créneau</h3>
                    <Filter label="Afficher" options={SORTS} value={sort} onChange={setSort} />
                    <Filter label="Moment" options={MOMENTS} value={moment} onChange={setMoment} />
                    <Filter label="Durée" options={DURATIONS} value={duration} onChange={setDuration} />

                    <p className={styles.slotsHelp}>
                        Les 3 jours les {sort === 'busy' ? 'plus chargés' : 'plus calmes'}, avec le nombre moyen de commandes sur ce créneau.
                    </p>
                    <ul className={styles.listBlock}>
                        {slots.map(slot => (
                            <li key={slot.day} className={styles.listItem}>
                                <span>{DAY_LABELS[slot.day]} de {slot.start}h à {slot.end}h</span>
                                <strong>{frNumber(slot.average)} cmd</strong>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
