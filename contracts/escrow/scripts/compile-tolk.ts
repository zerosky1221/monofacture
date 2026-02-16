/**
 * Tolk Contract Compilation Script
 *
 * Compiles escrow-deal.tolk to BOC using @ton/tolk-js
 */

import { runTolkCompiler, getTolkCompilerVersion } from '@ton/tolk-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Cell } from '@ton/core';

const CONTRACTS_DIR = join(__dirname, '../contracts/tolk');
const BUILD_DIR = join(__dirname, '../build');

// Ensure build directory exists
if (!existsSync(BUILD_DIR)) {
  mkdirSync(BUILD_DIR, { recursive: true });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     MONOFACTURE TOLK CONTRACT COMPILATION                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const version = await getTolkCompilerVersion();
  console.log(`\nTolk compiler version: ${version}`);

  console.log(`\nCompiling escrow-deal.tolk...`);
  console.log('='.repeat(60));

  const result = await runTolkCompiler({
    entrypointFileName: 'contracts/tolk/escrow-deal.tolk',
    fsReadCallback: (path: string) => {
      // The compiler requests files relative to the entrypoint
      // For stdlib files, tolk-js resolves them internally
      const fullPath = join(__dirname, '..', path);
      try {
        return readFileSync(fullPath, 'utf-8');
      } catch {
        throw new Error(`File not found: ${fullPath}`);
      }
    },
    optimizationLevel: 2,
    withStackComments: false,
  });

  if (result.status === 'error') {
    console.error('\n✗ Compilation failed:');
    console.error(result.message);
    process.exit(1);
  }

  // Save BOC file
  const bocBuffer = Buffer.from(result.codeBoc64, 'base64');
  const bocPath = join(BUILD_DIR, 'tolk-escrow-deal.boc');
  writeFileSync(bocPath, bocBuffer);
  console.log(`\n✓ BOC saved to: ${bocPath}`);

  // Save Fift file for debugging
  const fiftPath = join(BUILD_DIR, 'tolk-escrow-deal.fif');
  writeFileSync(fiftPath, result.fiftCode);
  console.log(`✓ Fift saved to: ${fiftPath}`);

  // Code hash
  console.log(`✓ Code hash: ${result.codeHashHex}`);

  // Calculate cell stats
  const codeCell = Cell.fromBoc(bocBuffer)[0];
  const slice = codeCell.beginParse();
  console.log(`✓ Code bits: ${slice.remainingBits}, refs: ${slice.remainingRefs}`);

  // Save compiled JSON (for use by wrappers)
  const compiledJson = {
    hash: result.codeHashHex,
    codeBoc: result.codeBoc64,
    sources: result.sourcesSnapshot.map((s) => s.filename),
  };
  const jsonPath = join(BUILD_DIR, 'tolk-escrow-deal.compiled.json');
  writeFileSync(jsonPath, JSON.stringify(compiledJson, null, 2));
  console.log(`✓ Compiled JSON saved to: ${jsonPath}`);

  if (result.stderr) {
    console.log(`\nCompiler warnings:\n${result.stderr}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ TOLK CONTRACT COMPILED SUCCESSFULLY');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
