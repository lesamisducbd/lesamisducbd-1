const crypto = require('crypto');
const fs = require('fs');

const secretKey = process.env.PRESTASHOP_SAS_SECRET_KEY;
if (!secretKey) {
    console.error('PRESTASHOP_SAS_SECRET_KEY non définie (ex : export PRESTASHOP_SAS_SECRET_KEY=... avant de lancer).');
    process.exit(1);
}
const cartId = 123;
const customerId = 45;
const ts = Math.floor(Date.now() / 1000);
const payload = `${cartId}-${customerId}-${ts}`;
const sign = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');

const url = `https://lesamisducbd.fr/sas.php?cart_id=${cartId}&id_customer=${customerId}&ts=${ts}&sign=${sign}`;

fs.writeFileSync('generated_url.txt', url);
console.log('done');
