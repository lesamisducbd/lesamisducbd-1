'use client';

import { useState, useEffect, useRef } from 'react';
import { Euro } from 'lucide-react';
import { addDays, shopToday } from '@/lib/utils/orderSlots';
import {
    LAUNCH_DATE, METRICS, REFERENCES,
    bucketSales, metricValue, referencePeriod, summarizePeriod,
} from '@/lib/utils/revenue';
import { Filter } from './OrderSlots';
import styles from './Analytics.module.css';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const PERIODS = [
    { value: 'launch', label: 'Depuis le nouveau site' },
    { value: 28, label: '4 dernières semaines' },
    { value: 91, label: '3 derniers mois' },
    { value: 365, label: '12 derniers mois' },
    { value: 'custom', label: 'Dates au choix' },
];

const UNITS = [
    { value: 'month', label: 'Par mois' },
    { value: 'week', label: 'Par semaine' },
];

const frDate = iso => iso.split('-').reverse().join('/');
const frNumber = (n, digits = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });

function bucketLabel(key, unit) {
    const [y, m, d] = key.split('-');
    return unit === 'month' ? `${MONTHS[m - 1]} ${y.slice(2)}` : `${d}/${m}`;
}

function DateRange({ value, min, max, onChange }) {
    return [['from', 'Du'], ['to', 'Au']].map(([field, label]) => (
        <label key={field} className={styles.filterField}>
            <span className={styles.filterLabel}>{label}</span>
            <input
                className={styles.select}
                type="date"
                min={min}
                max={max}
                value={value[field]}
                onChange={e => onChange({ ...value, [field]: e.target.value })}
            />
        </label>
    ));
}

export default function Revenue() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    // Filtres appliqués dans le navigateur : aucun appel supplémentaire.
    const [metric, setMetric] = useState('ht');
    const [period, setPeriod] = useState('launch');
    const [reference, setReference] = useState(6);
    const [customPeriod, setCustomPeriod] = useState({ from: '', to: '' });
    const [customReference, setCustomReference] = useState({ from: '', to: '' });
    const [unit, setUnit] = useState('month');
    const scroller = useRef(null);

    // Chargé une seule fois à l'ouverture : hors du rafraîchissement automatique de la page.
    useEffect(() => {
        fetch('/api/admin/revenue')
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    // Les périodes les plus récentes sont à droite : on s'y place.
    useEffect(() => {
        if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
    }, [data, period, reference, unit, customPeriod, customReference]);

    const hasData = Boolean(data && data.first);
    const yesterday = addDays(shopToday(), -1);
    let current = null;
    let compared = null;
    let shortened = false;
    if (hasData) {
        const clamp = date => (date < data.first ? data.first : date > yesterday ? yesterday : date);
        const range = (from, to) => {
            const [a, b] = [clamp(from), clamp(to)];
            return a <= b ? { from: a, to: b } : { from: b, to: a };
        };

        if (period === 'custom') current = range(customPeriod.from || LAUNCH_DATE, customPeriod.to || yesterday);
        else if (period === 'launch') current = range(LAUNCH_DATE, yesterday);
        else current = range(addDays(yesterday, 1 - period), yesterday);

        const wanted = reference === 'custom'
            ? {
                from: customReference.from || referencePeriod(6, current.from, current.to).from,
                to: customReference.to || addDays(current.from, -1),
            }
            : referencePeriod(reference, current.from, current.to);
        // Période entièrement antérieure à la première commande : rien à comparer.
        if (wanted.to >= data.first) {
            compared = range(wanted.from, wanted.to);
            shortened = wanted.from < data.first;
        }
    }

    const info = METRICS.find(m => m.value === metric);
    const format = (n, digits) => `${frNumber(n, digits)}${info.money ? ' €' : ''}`;

    const measure = range => {
        const sum = summarizePeriod(data.days, range.from, range.to);
        return { ...range, sum, value: metricValue(sum, metric, info.perMonth) };
    };
    const after = current && measure(current);
    const before = compared && measure(compared);
    const change = before?.value ? Math.round((after.value / before.value - 1) * 100) : null;

    // Le graphique couvre les deux périodes et ce qu'il y a entre elles.
    const buckets = current
        ? bucketSales(
            data.days,
            compared && compared.from < current.from ? compared.from : current.from,
            compared && compared.to > current.to ? compared.to : current.to,
            unit,
        )
        : [];
    const max = Math.max(1, ...buckets.map(b => metricValue(b, metric)));
    const overlaps = (bucket, range) => range && bucket.last >= range.from && bucket.first <= range.to;
    const barClass = bucket => {
        if (overlaps(bucket, current)) return '';
        return overlaps(bucket, compared) ? styles.barBefore : styles.barOutside;
    };
    // En euros, les barres sont en milliers dès que les montants sont grands.
    const inThousands = info.money && max >= 10000;
    const barValue = n => (inThousands ? frNumber(n / 1000, 1) : frNumber(n));

    const card = (title, result) => (
        <li className={styles.summaryCard}>
            <span>{title}{info.perMonth ? ', par mois' : ''}</span>
            <strong>{result ? format(result.value) : '-'}</strong>
            {result ? (
                <>
                    <span>Du {frDate(result.from)} au {frDate(result.to)}</span>
                    <span>
                        {metric === 'basket'
                            ? `Sur ${frNumber(result.sum.count)} commandes`
                            : `Total : ${format(result.sum[metric])}`}
                    </span>
                </>
            ) : <span>Aucune commande sur cette période</span>}
        </li>
    );

    return (
        <div className={styles.sectionBlock}>
            <div className={styles.ordersHeader}>
                <div>
                    <h2 className={`${styles.sectionTitle} ${styles.slotsTitle}`}>
                        <Euro size={18} /> Comparer les ventes
                    </h2>
                    <p className={styles.periodNote}>
                        Commandes validées, frais de port compris · nouveau site en ligne le {frDate(LAUNCH_DATE)}
                    </p>
                </div>
            </div>

            {failed && <p className={styles.subtitle}>Ventes indisponibles pour le moment.</p>}
            {!failed && !data && <p className={styles.subtitle}>Chargement des ventes...</p>}
            {data && !hasData && <p className={styles.subtitle}>Aucune commande trouvée.</p>}

            {hasData && (
                <>
                    <div className={styles.filterRow}>
                        <Filter label="Indicateur" options={METRICS} value={metric} onChange={setMetric} />
                        <Filter label="Période" options={PERIODS} value={period} onChange={setPeriod} />
                        {period === 'custom' && (
                            <DateRange
                                value={{ from: current.from, to: current.to }}
                                min={data.first}
                                max={yesterday}
                                onChange={setCustomPeriod}
                            />
                        )}
                        <Filter label="Comparer à" options={REFERENCES} value={reference} onChange={setReference} />
                        {reference === 'custom' && (
                            <DateRange
                                value={{ from: compared?.from || '', to: compared?.to || '' }}
                                min={data.first}
                                max={yesterday}
                                onChange={setCustomReference}
                            />
                        )}
                        <Filter label="Graphique" options={UNITS} value={unit} onChange={setUnit} />
                    </div>

                    <ul className={`${styles.summaryList} ${styles.revenueSummary}`}>
                        {card('Comparaison', before)}
                        {card('Période étudiée', after)}
                        <li className={styles.summaryCard}>
                            <span>Évolution</span>
                            <strong>{change === null ? '-' : `${change > 0 ? '+' : ''}${change} %`}</strong>
                            {change !== null && (
                                <span>
                                    {after.value >= before.value ? '+' : '-'}{format(Math.abs(after.value - before.value))}
                                    {info.perMonth ? ' par mois' : ''}
                                </span>
                            )}
                            {shortened && <span>Historique de comparaison incomplet</span>}
                        </li>
                    </ul>

                    <div className={styles.bars} ref={scroller}>
                        {buckets.map(bucket => {
                            const value = metricValue(bucket, metric);
                            return (
                                <div
                                    key={bucket.key}
                                    className={styles.barColumn}
                                    title={`${unit === 'week' ? 'Semaine du ' : ''}${bucketLabel(bucket.key, unit)} : ${format(value)}${bucket.partial ? ' (période incomplète)' : ''}`}
                                >
                                    <span className={styles.barValue}>{barValue(value)}</span>
                                    <span className={styles.barTrack}>
                                        <span
                                            className={`${styles.bar} ${barClass(bucket)} ${bucket.partial ? styles.barPartial : ''}`}
                                            style={{ height: `${(value / max) * 100}%` }}
                                        />
                                    </span>
                                    <span className={styles.barLabel}>{bucketLabel(bucket.key, unit)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className={styles.slotsHelp}>
                        {inThousands && 'En milliers d\'euros. '}Vert : période étudiée. Gris foncé : comparaison. Barre claire : période incomplète.
                        {metric === 'ttc' && ' La TVA des fleurs est passée à 20 % en juillet 2026 : préférez le HT pour comparer.'}
                        {' '}Une évolution ne vient pas forcément du seul nouveau site (saisons, croissance de la boutique).
                    </p>
                </>
            )}
        </div>
    );
}
