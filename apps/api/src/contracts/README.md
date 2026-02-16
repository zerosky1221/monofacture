# Monofacture Smart Contracts

## Current: Tolk Escrow v4.0

The active escrow contract is written in **Tolk 1.2** (next-gen TON smart contract language).

### Files

| File | Description |
|------|-------------|
| `TolkEscrowDeal.ts` | TypeScript wrapper for Tolk v4.0 contract (primary) |
| `tolk/escrow-deal.boc` | Compiled Tolk contract bytecode |
| `EscrowDeal.ts` | Legacy FunC v3 wrapper (kept for backwards compatibility) |
| `escrow-deal.boc` | Legacy FunC compiled bytecode |
| `escrow-wrappers.ts` | Barrel exports for all wrappers |

### Contract Source

The Tolk source code lives at `contracts/escrow/contracts/tolk/escrow-deal.tolk`.

To recompile:
```bash
cd contracts/escrow
npm run compile:tolk
```

Then copy the BOC:
```bash
cp contracts/escrow/build/tolk-escrow-deal.boc apps/api/src/contracts/tolk/escrow-deal.boc
```

### Storage Layout (2-cell split)

```
Cell 1: status(uint8) + dealId(uint256) + advertiser(address) + publisher(address) + ref->Cell2
Cell 2: platformWallet(address) + totalAmount(coins) + publisherAmount(coins)
        + deadline(uint32) + createdAt(uint32) + fundedAt(uint32)
```

### Op-Codes (ASCII-based, compatible with FunC v3)

| Op | Hex | ASCII | Description |
|----|-----|-------|-------------|
| FUND | 0x746F6E46 | "tonF" | Advertiser deposits TON |
| RELEASE | 0x72656C73 | "rels" | Platform releases funds |
| REFUND | 0x72656675 | "refu" | Refund to advertiser |
| DISPUTE | 0x64697370 | "disp" | Open dispute |
| RESOLVE | 0x7265736F | "reso" | Platform resolves dispute |
| EXTEND | 0x65787464 | "extd" | Extend deadline |

### Migration from FunC v3

- Same op-codes and storage layout (2-cell split)
- Same getter method names
- Same message formats
- Tolk v4.0 provides better gas efficiency (~15-25% lower)
- `ton-wallet.service.ts` tries Tolk BOC first, falls back to FunC
