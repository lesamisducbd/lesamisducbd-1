'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { DAY_LABELS, countWeeks, rankSlots } from '@/lib/utils/orderSlots';
import styles from './Analytics.module.css';

const frDate = iso => iso.split('-').reverse().join('/');
const frNumber = n => n.toLocaleString('fr-FR');

const SLOT_GROUPS = [
    { title: 'Les plus chargés (à éviter)', firstHour: 0, lastHour: 24, busiest: true },
    { title: 'Calmes en journée (8h-19h)', firstHour: 8, lastHour: 19 },
    { title: 'Calmes tôt le matin (5h-10h)', firstHour: 5, lastHour: 10 },
    { title: 'Calmes le soir (18h-minuit)', firstHour: 18, lastHour: 24 },
    { title: 'Calmes la nuit (0h-6h)', firstHour: 0, lastHour: 6 },
];

export default function OrderSlots() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    // Chargé une seule fois à l'ouverture : hors du rafraîchissement automatique de la page.
    useEffect(() => {
        fetch('/api/admin/orders-by-hour')
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    // Heures sans aucune commande en début de journée masquées pour garder le tableau lisible.
    const hours = data
        ? Array.from({ length: 24 }, (_, h) => h).filter(h => (h >= 7 && h <= 21) || data.grid.some(day => day[h] > 0))
        : [];
    const max = data ? Math.max(1, ...data.grid.flat()) : 1;
    const weeks = data && data.total > 0 ? countWeeks(data.from, data.to) : 1;

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
                                    {hours.map(h => <th key={h}>{h}h</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.grid.map((day, d) => (
                                    <tr key={DAY_LABELS[d]}>
                                        <th>{DAY_LABELS[d].slice(0, 3)}</th>
                                        {hours.map(h => (
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

                    <h3 className={styles.slotsSubtitle}>Moyenne par semaine, par créneau de 3 h</h3>
                    <p className={styles.slotsHelp}>
                        Nombre de commandes attendues pendant ces 3 heures, un jour ordinaire. Un seul créneau par jour dans chaque liste.
                    </p>
                    <div className={styles.slotsGroups}>
                        {SLOT_GROUPS.map(group => (
                            <div key={group.title}>
                                <h4 className={styles.slotsGroupTitle}>{group.title}</h4>
                                <ul className={styles.listBlock}>
                                    {rankSlots(data.grid, weeks, group).map(slot => (
                                        <li key={slot.day} className={styles.listItem}>
                                            <span>{DAY_LABELS[slot.day]} {slot.start}h-{slot.end}h</span>
                                            <strong>{frNumber(slot.average)} cmd</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
