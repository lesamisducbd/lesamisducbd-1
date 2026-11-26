'use client';

import { useEffect, useState } from 'react';
import { Loader2, Power, Wrench } from 'lucide-react';
import styles from './Maintenance.module.css';

export default function MaintenancePage() {
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const request = async (options) => {
        const res = await fetch('/api/admin/maintenance', { cache: 'no-store', ...options });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Session expirée ou accès réservé au Super Admin.');
        if (!res.ok) throw new Error(data.error || 'Erreur serveur');
        return data;
    };

    useEffect(() => {
        request().then(setState).catch((e) => setError(e.message));
    }, []);

    const toggle = async () => {
        const enabled = !state.enabled;
        const question = enabled
            ? 'Mettre le site en maintenance ? Les clients ne pourront plus l’utiliser.'
            : 'Remettre le site en ligne ?';
        if (!window.confirm(question)) return;

        setIsSaving(true);
        setError('');
        try {
            setState(await request({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            }));
        } catch (e) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}><Wrench size={28} /> Maintenance</h1>
            <p className={styles.subtitle}>Fermez temporairement le site aux clients.</p>

            {error && <div className={styles.error} role="alert">{error}</div>}

            {!state && !error && <Loader2 className={styles.spinner} size={28} />}

            {state && (
                <div className={styles.card}>
                    <span className={state.enabled ? styles.badgeOff : styles.badgeOn}>
                        {state.enabled ? 'Site en maintenance' : 'Site en ligne'}
                    </span>

                    <button
                        type="button"
                        onClick={toggle}
                        disabled={isSaving}
                        className={state.enabled ? styles.buttonOn : styles.buttonOff}
                    >
                        {isSaving ? <Loader2 className={styles.spinner} size={20} /> : <Power size={20} />}
                        {state.enabled ? 'Remettre le site en ligne' : 'Mettre en maintenance'}
                    </button>

                    {state.updatedAt && (
                        <p className={styles.meta}>
                            Dernier changement le {new Date(state.updatedAt).toLocaleString('fr-FR')} par {state.updatedBy}
                        </p>
                    )}

                    <ul className={styles.notes}>
                        <li>Les visiteurs voient une page « Site en maintenance » : navigation, comptes et commandes sont bloqués.</li>
                        <li>Le changement est effectif en 15 secondes environ.</li>
                        <li>Connecté à l’admin, vous continuez à voir le site normalement. Vérifiez le résultat en navigation privée.</li>
                        <li>La boutique PrestaShop (my.lesamisducbd.fr), dont la page de paiement, n’est pas fermée par ce bouton.</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
