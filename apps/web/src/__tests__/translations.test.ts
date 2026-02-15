import en from '../i18n/locales/en.json';
import ru from '../i18n/locales/ru.json';

const getKeys = (obj: Record<string, any>, prefix = ''): string[] => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getKeys(value as Record<string, any>, fullKey);
    }
    return [fullKey];
  });
};

const enKeys = getKeys(en);
const ruKeys = getKeys(ru);

let hasError = false;

const missingInRu = enKeys.filter(k => !ruKeys.includes(k));
if (missingInRu.length > 0) {
  console.error(`Missing in ru.json (${missingInRu.length}):`);
  missingInRu.forEach(k => console.error(`  - ${k}`));
  hasError = true;
}

const extraInRu = ruKeys.filter(k => !enKeys.includes(k));
if (extraInRu.length > 0) {
  console.warn(`Extra keys in ru.json (${extraInRu.length}):`);
  extraInRu.forEach(k => console.warn(`  + ${k}`));
}

console.log(`\nEN: ${enKeys.length} keys`);
console.log(`RU: ${ruKeys.length} keys (missing: ${missingInRu.length}, extra: ${extraInRu.length})`);

if (hasError) {
  console.error('\nTranslation check FAILED');
  process.exit(1);
} else {
  console.log('\nTranslation check PASSED - all keys match');
}
