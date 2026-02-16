/**
 * FunC Contract Compilation Script
 *
 * Compiles escrow-deal.fc and escrow-factory.fc to BOC files
 * using @ton-community/func-js
 */

import { compileFunc } from '@ton-community/func-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Cell } from '@ton/core';

const CONTRACTS_DIR = join(__dirname, '../contracts');
const BUILD_DIR = join(__dirname, '../build');

// Ensure build directory exists
if (!existsSync(BUILD_DIR)) {
  mkdirSync(BUILD_DIR, { recursive: true });
}

// Read stdlib.fc once
const stdlibContent = readFileSync(join(CONTRACTS_DIR, 'stdlib.fc'), 'utf-8');

async function compileContract(name: string, entryFile: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Compiling ${name}...`);
  console.log('='.repeat(60));

  const source = readFileSync(join(CONTRACTS_DIR, entryFile), 'utf-8');

  // Use source map approach with stdlib and the contract
  const result = await compileFunc({
    targets: ['stdlib.fc', entryFile],
    sources: {
      'stdlib.fc': stdlibContent,
      [entryFile]: source,
    },
  });

  if (result.status === 'error') {
    console.error(`\nCompilation failed for ${name}:`);
    console.error(result.message);
    throw new Error(`Failed to compile ${name}`);
  }

  // Save BOC file
  const bocPath = join(BUILD_DIR, `${name}.boc`);
  writeFileSync(bocPath, Buffer.from(result.codeBoc, 'base64'));
  console.log(`\n✓ BOC saved to: ${bocPath}`);

  // Save Fift file for debugging
  const fiftPath = join(BUILD_DIR, `${name}.fif`);
  writeFileSync(fiftPath, result.fiftCode);
  console.log(`✓ Fift saved to: ${fiftPath}`);

  // Calculate code hash
  const codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, 'base64'))[0];
  console.log(`✓ Code hash: ${codeCell.hash().toString('hex')}`);

  return result;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     MONOFACTURE FunC CONTRACT COMPILATION                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Compile escrow-deal.fc
    await compileContract('escrow-deal', 'escrow-deal.fc');

    // Compile escrow-factory.fc
    await compileContract('escrow-factory', 'escrow-factory.fc');

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL CONTRACTS COMPILED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nBuild artifacts:');
    console.log(`  ${BUILD_DIR}/escrow-deal.boc`);
    console.log(`  ${BUILD_DIR}/escrow-factory.boc`);
    console.log(`  ${BUILD_DIR}/escrow-deal.fif`);
    console.log(`  ${BUILD_DIR}/escrow-factory.fif`);
  } catch (error) {
    console.error('\n✗ Compilation failed:', error);
    process.exit(1);
  }
}

main();
