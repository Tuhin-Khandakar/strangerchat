import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dotEnvPath = path.join(rootDir, '.env');
const exampleEnvPath = path.join(rootDir, '.env.example');

console.log('🔍 Validating configuration...');

if (!fs.existsSync(dotEnvPath)) {
  console.error('❌ Error: .env file not found!');
  console.log('💡 Tip: Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const parseEnv = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const vars = {};
  lines.forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Remove optional quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }
      vars[key] = value;
    }
  });
  return vars;
};

const devEnv = parseEnv(dotEnvPath);
const exampleEnv = parseEnv(exampleEnvPath);

let errors = 0;
let warnings = 0;

const requiredVars = ['ADMIN_PASSWORD', 'SESSION_SECRET', 'BASE_URL'];

// 1. Check for missing variables from .env.example
Object.keys(exampleEnv).forEach((key) => {
  if (!(key in devEnv)) {
    console.warn(`⚠️  Warning: Missing variable "${key}" in .env (found in .env.example)`);
    warnings++;
  }
});

// 2. Check for required variables having default values from .env.example
requiredVars.forEach((key) => {
  if (devEnv[key] === exampleEnv[key]) {
    console.error(`❌ Error: Variable "${key}" in .env still has the example value!`);
    errors++;
  }
});

// 3. Specific production checks
// We only enforce production rules if .env explicitly says production.
// Otherwise, local developers might get errors due to missing prod-only keys.
const targetEnv = devEnv.NODE_ENV || 'development';
if (targetEnv === 'production') {
  if (devEnv.ADMIN_PASSWORD && devEnv.ADMIN_PASSWORD.length < 12) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 12 characters in production.');
    errors++;
  }
  if (devEnv.SESSION_SECRET && devEnv.SESSION_SECRET.length < 32) {
    console.error('❌ Error: SESSION_SECRET must be at least 32 characters in production.');
    errors++;
  }
  if (!devEnv.VAPID_PUBLIC_KEY || devEnv.VAPID_PUBLIC_KEY === 'your_public_key_here') {
    console.error('❌ Error: VAPID keys are required for production push notifications.');
    errors++;
  }
}

if (errors > 0) {
  console.error(
    `\n❌ Configuration validation failed with ${errors} error(s) and ${warnings} warning(s).`
  );
  process.exit(1);
} else {
  console.log(`\n✅ Configuration validation passed with ${warnings} warning(s).`);
}
