import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PAGES_DIR = 'D:/Monofacture/apps/web/src/pages';
const REPO_ROOT = 'D:/Monofacture';

function getAllTsxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function isDirective(text) {
  return (
    text.includes('@ts-ignore') ||
    text.includes('@ts-expect-error') ||
    text.includes('eslint-disable') ||
    text.includes('eslint-enable')
  );
}

function findLineStart(str) {
  let k = str.length - 1;
  while (k >= 0 && str[k] !== '\n') k--;
  return k; // index of \n, or -1 if at start of string
}

function removeComments(source) {
  source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let result = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    // ── String literals ──
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      result += ch;
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\') {
          result += source[i] + (i + 1 < len ? source[i + 1] : '');
          i += 2;
        } else if (quote === '`' && source[i] === '$' && i + 1 < len && source[i + 1] === '{') {
          result += '${';
          i += 2;
          let depth = 1;
          while (i < len && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') { depth--; if (depth === 0) break; }
            if (source[i] === '"' || source[i] === "'" || source[i] === '`') {
              const q2 = source[i];
              result += source[i]; i++;
              while (i < len && source[i] !== q2) {
                if (source[i] === '\\') { result += source[i]; i++; if (i < len) { result += source[i]; i++; } }
                else { result += source[i]; i++; }
              }
              if (i < len) { result += source[i]; i++; }
            } else {
              result += source[i]; i++;
            }
          }
          if (i < len) { result += '}'; i++; }
        } else {
          result += source[i]; i++;
        }
      }
      if (i < len) { result += source[i]; i++; }
      continue;
    }

    // ── Single-line comment // ──
    if (ch === '/' && i + 1 < len && source[i + 1] === '/') {
      let commentText = '';
      let j = i;
      while (j < len && source[j] !== '\n') { commentText += source[j]; j++; }

      if (isDirective(commentText)) {
        result += commentText;
        i = j;
        continue;
      }

      const lineStartIdx = findLineStart(result);
      const beforeOnLine = result.substring(lineStartIdx + 1);
      const beforeTrimmed = beforeOnLine.trim();

      if (beforeTrimmed === '') {
        // Entire line is whitespace + comment -> remove it
        result = result.substring(0, lineStartIdx + 1);
        // Also consume the trailing \n to remove the line entirely
        if (j < len && source[j] === '\n') j++;
        i = j;
      } else {
        // Code before comment -> keep code, drop comment
        while (result.length > 0 && (result[result.length - 1] === ' ' || result[result.length - 1] === '\t')) {
          result = result.slice(0, -1);
        }
        i = j;
      }
      continue;
    }

    // ── Multi-line comment /* ... */ ──
    if (ch === '/' && i + 1 < len && source[i + 1] === '*') {
      let commentText = '/*';
      let j = i + 2;
      while (j < len) {
        if (source[j] === '*' && j + 1 < len && source[j + 1] === '/') {
          commentText += '*/';
          j += 2;
          break;
        }
        commentText += source[j];
        j++;
      }

      if (isDirective(commentText)) {
        result += commentText;
        i = j;
        continue;
      }

      const lineStartIdx = findLineStart(result);
      const beforeOnLine = result.substring(lineStartIdx + 1);
      const beforeTrimmed = beforeOnLine.trim();

      // What's after the comment?
      let afterIdx = j;
      while (afterIdx < len && (source[afterIdx] === ' ' || source[afterIdx] === '\t')) afterIdx++;

      // Detect JSX comment: {/* ... */}
      const isJsxComment = beforeTrimmed === '{' && afterIdx < len && source[afterIdx] === '}';

      if (isJsxComment) {
        result = result.substring(0, lineStartIdx + 1);
        afterIdx++; // skip }
        while (afterIdx < len && (source[afterIdx] === ' ' || source[afterIdx] === '\t')) afterIdx++;
        if (afterIdx < len && source[afterIdx] === '\n') afterIdx++;
        i = afterIdx;
        continue;
      }

      // Non-JSX comment
      const afterIsNewline = afterIdx >= len || source[afterIdx] === '\n';

      if (beforeTrimmed === '' && afterIsNewline) {
        // Standalone comment line -> remove entire line
        result = result.substring(0, lineStartIdx + 1);
        i = afterIdx < len ? afterIdx + 1 : afterIdx;
      } else if (beforeTrimmed === '') {
        // Comment at start with code after
        result = result.substring(0, lineStartIdx + 1);
        i = j;
      } else {
        // Code before comment -> trim trailing spaces, drop comment
        while (result.length > 0 && (result[result.length - 1] === ' ' || result[result.length - 1] === '\t')) {
          result = result.slice(0, -1);
        }
        i = j;
      }
      continue;
    }

    // ── Regex literal or JSX self-closing / division ──
    if (ch === '/') {
      // If next char is >, this is JSX self-closing tag />
      if (i + 1 < len && source[i + 1] === '>') {
        result += ch; i++;
        continue;
      }

      let p = result.length - 1;
      while (p >= 0 && (result[p] === ' ' || result[p] === '\t' || result[p] === '\n' || result[p] === '\r')) p--;
      const prev = p >= 0 ? result[p] : '';
      // Include " ' ` > in division chars - these indicate end of string/JSX, not regex context
      const isDivision = /[a-zA-Z0-9_$\)\]"'`>]/.test(prev);

      if (!isDivision) {
        result += ch; i++;
        while (i < len && source[i] !== '/' && source[i] !== '\n') {
          if (source[i] === '\\' && i + 1 < len) { result += source[i] + source[i+1]; i += 2; }
          else if (source[i] === '[') {
            result += source[i]; i++;
            while (i < len && source[i] !== ']' && source[i] !== '\n') {
              if (source[i] === '\\' && i + 1 < len) { result += source[i] + source[i+1]; i += 2; }
              else { result += source[i]; i++; }
            }
            if (i < len && source[i] === ']') { result += ']'; i++; }
          }
          else { result += source[i]; i++; }
        }
        if (i < len && source[i] === '/') { result += '/'; i++; }
        while (i < len && /[gimsuy]/.test(source[i])) { result += source[i]; i++; }
        continue;
      }

      result += ch; i++;
      continue;
    }

    // ── Default ──
    result += ch;
    i++;
  }

  return result;
}

function collapseBlankLines(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

// ── STEP 1: Restore all files from git HEAD ──
console.log('Restoring files from git HEAD...');
const files = getAllTsxFiles(PAGES_DIR);
console.log(`Found ${files.length} .tsx files`);

let restoreErrors = 0;
for (const filePath of files) {
  const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
  try {
    const original = execSync(`git show HEAD:${relativePath}`, { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(filePath, original, 'utf-8');
  } catch (e) {
    console.error(`  WARN: Could not restore ${relativePath}`);
    restoreErrors++;
  }
}
console.log(`Files restored (${restoreErrors} errors).\n`);

// ── STEP 2: Process each file ──
let totalLinesRemoved = 0;

for (const filePath of files) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const originalLines = original.split('\n').length;

  let processed = removeComments(original);
  processed = collapseBlankLines(processed);
  processed = processed.split('\n').map(line => line.replace(/\s+$/, '')).join('\n');
  processed = processed.replace(/\n+$/, '\n');

  const newLines = processed.split('\n').length;
  const linesRemoved = originalLines - newLines;

  if (processed !== original) {
    fs.writeFileSync(filePath, processed, 'utf-8');
    console.log(`${path.relative(PAGES_DIR, filePath)}: ${originalLines} -> ${newLines} lines (${linesRemoved} removed)`);
    totalLinesRemoved += linesRemoved;
  } else {
    console.log(`${path.relative(PAGES_DIR, filePath)}: no changes`);
  }
}

console.log(`\nDone! Total lines removed: ${totalLinesRemoved}`);
