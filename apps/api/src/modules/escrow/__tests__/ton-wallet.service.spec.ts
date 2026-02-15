import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TonWalletService } from '../ton-wallet.service';

describe('TonWalletService', () => {
  let service: TonWalletService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TonWalletService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'ton.escrowMasterSeed': 'test seed phrase for testing purposes only not real',
                'ton.platformWalletAddress': 'EQTest123456789',
                'ton.testnet': true,
                'ton.apiKey': '',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TonWalletService>(TonWalletService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('formatTon', () => {
    it('should format nanoTON to TON string', () => {
      const nanoTon = BigInt(1_000_000_000);
      const result = service.formatTon(nanoTon);
      expect(result).toBe('1');
    });

    it('should format fractional TON correctly', () => {
      const nanoTon = BigInt(1_500_000_000);
      const result = service.formatTon(nanoTon);
      expect(result).toBe('1.5');
    });

    it('should format zero', () => {
      const result = service.formatTon(BigInt(0));
      expect(result).toBe('0');
    });
  });

  describe('parseTon', () => {
    it('should parse TON string to nanoTON', () => {
      const result = service.parseTon('1');
      expect(result).toBe(BigInt(1_000_000_000));
    });

    it('should parse fractional TON', () => {
      const result = service.parseTon('1.5');
      expect(result).toBe(BigInt(1_500_000_000));
    });

    it('should parse zero', () => {
      const result = service.parseTon('0');
      expect(result).toBe(BigInt(0));
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid TON address', () => {

      const validAddress = 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2';
      const result = service.isValidAddress(validAddress);
      expect(result).toBe(true);
    });

    it('should return false for invalid address', () => {
      const result = service.isValidAddress('invalid-address');
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = service.isValidAddress('');
      expect(result).toBe(false);
    });
  });

  describe('getPlatformWalletAddress', () => {
    it('should return configured platform wallet address', () => {
      const result = service.getPlatformWalletAddress();
      expect(result).toBe('EQTest123456789');
    });
  });

  describe('generatePaymentLink', () => {
    it('should generate valid TON payment link', () => {
      const address = 'EQTest123';
      const amount = BigInt(1_000_000_000);
      const result = service.generatePaymentLink(address, amount);

      expect(result).toContain('ton://transfer/');
      expect(result).toContain(address);
    });

    it('should include memo in payment link', () => {
      const address = 'EQTest123';
      const amount = BigInt(1_000_000_000);
      const memo = 'Test payment';
      const result = service.generatePaymentLink(address, amount, memo);

      expect(result).toContain('text=');
    });
  });

  describe('generateEscrowWallet', () => {
    it('should generate unique wallet for different deal IDs', async () => {
      const wallet1 = await service.generateEscrowWallet('deal-1');
      const wallet2 = await service.generateEscrowWallet('deal-2');

      expect(wallet1.address).toBeDefined();
      expect(wallet2.address).toBeDefined();
      expect(wallet1.address).not.toBe(wallet2.address);
    });

    it('should return wallet with public key', async () => {
      const wallet = await service.generateEscrowWallet('deal-test');

      expect(wallet.address).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.publicKey.length).toBeGreaterThan(0);
    });
  });
});
