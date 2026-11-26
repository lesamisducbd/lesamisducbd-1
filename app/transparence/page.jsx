
import TransparenceClient from './TransparenceClient';
import { freshKvGet } from '@/lib/kvCache';

export const metadata = {
    title: 'Transparence et Analyses | Les Amis du CBD',
    description: 'Découvrez notre engagement envers la qualité et consultez les résultats de nos analyses en laboratoire.',
};

export const revalidate = 3600;

export default async function TransparencePage() {
    const [globalContent, content] = await Promise.all([
        freshKvGet('global_content', null),
        freshKvGet('transparence_content', null)
    ]);

    return <TransparenceClient globalContent={globalContent} content={content} />;
}
