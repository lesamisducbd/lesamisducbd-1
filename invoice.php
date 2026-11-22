<?php
/**
 * Passerelle Headless - Téléchargement de Facture PDF v1.1
 */
ini_set('display_errors', 0);
error_reporting(0);

require(dirname(__FILE__) . '/config/config.inc.php');
require(dirname(__FILE__) . '/init.php'); // Requis pour initialiser Smarty et Context

/**
 * Secrets de signature : lus dans app/config/sas_secrets.php (fichier présent uniquement sur le serveur,
 * jamais dans le dépôt). Même fichier que sas.php. Voir sas_secrets.example.php.
 */
$sas_secrets_file = dirname(__FILE__) . '/app/config/sas_secrets.php';
$sas_secrets = is_file($sas_secrets_file) ? include $sas_secrets_file : [];
$sas_secrets = array_values(array_filter((array)$sas_secrets, 'is_string'));
if (!$sas_secrets) {
    die('Erreur : configuration de sécurité manquante.');
}

$id_order = (int)Tools::getValue('id_order');
$id_customer = (int)Tools::getValue('id_customer');
$ts = (int)Tools::getValue('ts');
$signature = Tools::getValue('sign');

if (!$id_order || !$id_customer || !$signature || !$ts) {
    die('Erreur : Paramètres manquants.');
}

if (time() > ($ts + 1800)) { // 30 minutes de validité
    die('Erreur : Lien expiré.');
}

$payload = $id_order . '-' . $id_customer . '-' . $ts;
$signature_valide = false;
foreach ($sas_secrets as $secret_key) {
    if (hash_equals(hash_hmac('sha256', $payload, $secret_key), (string)$signature)) {
        $signature_valide = true;
        break;
    }
}

if (!$signature_valide) {
    die('Erreur : Signature invalide.');
}

$order = new Order($id_order);
if (!Validate::isLoadedObject($order) || $order->id_customer != $id_customer) {
    die('Erreur : Commande introuvable ou accès refusé.');
}

$invoices = $order->getInvoicesCollection();
if (!count($invoices)) {
    die('Erreur : Aucune facture disponible pour cette commande. Vérifiez son statut sur PrestaShop.');
}

if (ob_get_length() > 0) {
    ob_clean();
}

$pdf = new PDF($invoices, PDF::TEMPLATE_INVOICE, Context::getContext()->smarty);
$pdf->render();
exit;
