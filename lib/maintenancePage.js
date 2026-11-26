// Page servie par le middleware pendant la maintenance. HTML autonome : ni panier,
// ni vérification d'âge, ni aucun script du site ne sont chargés.
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Maintenance en cours | Les Amis du CBD</title>
<link rel="icon" href="/icon.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;800&display=swap">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
         padding: 10px; background: #E3FFF8; color: #FFFFFF; text-align: center;
         font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
  main { width: 100%; max-width: 560px; padding: 48px 24px; border-radius: 28px; background: #1F4B40; }
  img { width: 180px; max-width: 70%; height: auto; margin-bottom: 32px; }
  h1 { font-size: clamp(1.6rem, 6vw, 2.2rem); font-weight: 800; color: #00FF94; margin-bottom: 16px; }
  p { font-size: 1rem; line-height: 1.6; }
</style>
</head>
<body>
<main>
  <img src="/images/logo.webp" alt="Les Amis du CBD">
  <h1>Site en maintenance</h1>
  <p>Nous améliorons votre boutique. Elle sera de retour très bientôt, merci de votre patience.</p>
</main>
</body>
</html>`;
