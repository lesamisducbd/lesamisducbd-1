<?php
/**
 * MODÈLE du fichier de secrets de signature de sas.php et invoice.php.
 *
 * À copier SUR LE SERVEUR PrestaShop (jamais dans le dépôt) vers : app/config/sas_secrets.php
 * puis remplacer les valeurs. Le premier secret est le secret courant (celui de la variable Vercel
 * PRESTASHOP_SAS_SECRET_KEY) ; les suivants sont encore acceptés le temps d'une rotation, puis à retirer.
 *
 * Générer un secret : openssl rand -hex 32
 */
return [
    'NOUVEAU_SECRET_ICI',
    // 'ANCIEN_SECRET_A_RETIRER_APRES_LA_ROTATION',
];
