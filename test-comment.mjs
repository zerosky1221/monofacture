import fs from 'fs';

const source = fs.readFileSync('D:/Monofacture/apps/web/src/pages/DealDetailPage.tsx', 'utf-8');
const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Find the position of "Parties" in the source
const idx = normalized.indexOf('Parties');
console.log('Position of Parties:', idx);
console.log('Context (20 chars before and after):');
const start = Math.max(0, idx - 20);
const end = Math.min(normalized.length, idx + 30);
for (let i = start; i < end; i++) {
  console.log(`  pos ${i}: ${JSON.stringify(normalized[i])} (${normalized.charCodeAt(i)})`);
}

// Check what's at /* before Parties
const commentStart = normalized.lastIndexOf('/*', idx);
console.log('\n/* found at position:', commentStart);
console.log('Characters at commentStart:', JSON.stringify(normalized.substring(commentStart, commentStart + 5)));

// Check what's before the /*
console.log('\nBefore /*:');
for (let i = Math.max(0, commentStart - 5); i < commentStart; i++) {
  console.log(`  pos ${i}: ${JSON.stringify(normalized[i])} (${normalized.charCodeAt(i)})`);
}

// Now let's check: does our scanner even reach this position?
// Simulate scanning up to this point
let scanPos = 0;
let depth = 0;
let inString = false;
let lastComment = '';

// Just check the region around the comment
const regionStart = Math.max(0, commentStart - 100);
console.log('\nRegion around comment (source[' + regionStart + '..' + (commentStart + 20) + ']):');
console.log(JSON.stringify(normalized.substring(regionStart, commentStart + 20)));
