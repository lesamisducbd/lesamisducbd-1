
import LivraisonClient from './LivraisonClient';
import { freshKvGet } from '@/lib/kvCache';

export const metadata = {
    title: 'Livraison et Expédition | Les Amis du CBD',
    description: 'Découvrez nos méthodes d\'expédition, nos délais de livraison rapides et nos garanties de discrétion.',
};

export const revalidate = 3600;

export default async function LivraisonPage() {
    const [globalContent, content] = await Promise.all([
        freshKvGet('global_content', null),
        freshKvGet('livraison_content', null)
    ]);

    return <LivraisonClient globalContent={globalContent} content={content} />;
}
