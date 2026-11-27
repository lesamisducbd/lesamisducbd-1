'use client';

import { useState, useEffect, useRef } from 'react';
import { Euro } from 'lucide-react';
import styles from './Analytics.module.css';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const frDate = iso => iso.split('-').reverse().join('/');
const euros = n => `${Math.round(n).toLocaleString('fr-FR')} €`;
const thousands = n => (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const monthLabel = key => `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(2, 4)}`;

export default function Revenue() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const scroller = useRef(null);

    // Chargé une seule fois à l'ouverture : hors du rafraîchissement automatique de la page.
    useEffect(() => {
        fetch('/api/admin/revenue')
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    // Les mois les plus récents sont à droite : on s'y place.
    useEffect(() => {
        if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
    }, [data]);

    const { before, after, months = [] } = data || {};
    const max = Math.max(1, ...months.map(m => m.total));
    const change = before?.perMonth ? Math.round((after.perMonth / before.perMonth - 1) * 100) : null;

    return (
        <div className={styles.sectionBlock}>
            <h2 className={`${styles.sectionTitle} ${styles.slotsTitle}`}>
                <Euro size={18} /> Chiffre d&apos;affaires avant / après le nouveau site
            </h2>

            {failed && <p className={styles.subtitle}>Chiffre d&apos;affaires indisponible pour le moment.</p>}
            {!failed && !data && <p className={styles.subtitle}>Chargement du chiffre d&apos;affaires...</p>}

            {data && (
                <>
                    <p className={styles.periodNote}>
                        Hors taxes, commandes validées, frais de port compris · mise en ligne le {frDate(after.from)}
                    </p>

                    <ul className={`${styles.summaryList} ${styles.revenueSummary}`}>
                        <li className={styles.summaryCard}>
                            <span>Avant, par mois</span>
                            <strong>{euros(before.perMonth)}</strong>
                            <span>Du {frDate(before.from)} au {frDate(before.to)}</span>
                            <span>Panier moyen : {euros(before.basket)}</span>
                        </li>
                        <li className={styles.summaryCard}>
                            <span>Depuis le nouveau site, par mois</span>
                            <strong>{euros(after.perMonth)}</strong>
                            <span>Du {frDate(after.from)} au {frDate(after.to)}</span>
                            <span>Panier moyen : {euros(after.basket)}</span>
                        </li>
                        <li className={styles.summaryCard}>
                            <span>Évolution par mois</span>
                            <strong>{change === null ? '-' : `${change > 0 ? '+' : ''}${change} %`}</strong>
                            <span>Total depuis la mise en ligne : {euros(after.total)}</span>
                            <span>{after.count.toLocaleString('fr-FR')} commandes</span>
                        </li>
                    </ul>

                    <div className={styles.bars} ref={scroller}>
                        {months.map(month => (
                            <div
                                key={month.key}
                                className={styles.barColumn}
                                title={`${monthLabel(month.key)} : ${euros(month.total)} HT${month.partial ? ' (mois en cours)' : ''}`}
                            >
                                <span className={styles.barValue}>{thousands(month.total)}</span>
                                <span className={styles.barTrack}>
                                    <span
                                        className={`${styles.bar} ${month.after ? '' : styles.barBefore} ${month.partial ? styles.barPartial : ''}`}
                                        style={{ height: `${(month.total / max) * 100}%` }}
                                    />
                                </span>
                                <span className={styles.barLabel}>{monthLabel(month.key)}</span>
                            </div>
                        ))}
                    </div>
                    <p className={styles.slotsHelp}>
                        En milliers d&apos;euros. Gris : ancien site. Vert : nouveau site. Barre claire : mois en cours. Cette évolution ne vient pas
                        forcément du seul nouveau site (saisons, croissance de la boutique).
                    </p>
                </>
            )}
        </div>
    );
}
