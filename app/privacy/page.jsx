
import PrivacyClient from './PrivacyClient';
import { freshKvGet } from '@/lib/kvCache';

export const metadata = {
    title: 'Politique de confidentialité | Les Amis du CBD',
    description: 'Consultez la Politique de confidentialité de la boutique Les Amis du CBD.',
};

export const revalidate = 3600;

export default async function PrivacyPage() {
    const [globalContent, content] = await Promise.all([
        freshKvGet('global_content', null),
        freshKvGet('privacy_content', null)
    ]);

    return <PrivacyClient globalContent={globalContent} content={content} />;
}
