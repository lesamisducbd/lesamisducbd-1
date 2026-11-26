'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { DAY_LABELS } from '@/lib/utils/orderSlots';
import styles from './Analytics.module.css';

const frDate = iso => iso.split('-').reverse().join('/');

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
                        {data.total.toLocaleString('fr-FR')} commandes du {frDate(data.from)} au {frDate(data.to)} (heure de la boutique).
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

                    <h3 className={styles.slotsSubtitle}>Créneaux de 3 h les plus calmes en journée (8h-19h)</h3>
                    <ul className={styles.listBlock}>
                        {data.quietest.slice(0, 3).map(slot => (
                            <li key={slot.day} className={styles.listItem}>
                                <span>{DAY_LABELS[slot.day]} de {slot.start}h à {slot.end}h</span>
                                <strong>{slot.average.toLocaleString('fr-FR')} cmd en moyenne</strong>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
