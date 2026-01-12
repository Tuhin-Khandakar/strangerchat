const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '.env');
try {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(
    /VAPID_PUBLIC_KEY=.*/,
    'VAPID_PUBLIC_KEY=BBmaei4xOktw0HqvunqLODXVgz5LNQZymEQZsQC9sgXPf0nrssQc-aAUvzX7NhR9QwG_NWq32BjMm96VN541n34'
  );
  content = content.replace(
    /VAPID_PRIVATE_KEY=.*/,
    'VAPID_PRIVATE_KEY=jbPM4-k23LaZnpbBFVQlhYs83IKYRZGNps7eS4_J1oU'
  );
  fs.writeFileSync(p, content);
  console.log('Updated .env keys');
} catch (e) {
  console.error(e);
}
