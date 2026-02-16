import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PriceCalculation {
  pricePerHour: bigint;
  duration: number | null;
  isPermanent: boolean;
  subtotal: bigint;
  platformFee: bigint;
  totalAmount: bigint;
  feeRate: number;
}

@Injectable()
export class PricingService {
  constructor(private readonly configService: ConfigService) {}

  calculateHourlyPrice(
    pricePerHour: bigint,
    hours: number,
    minHours: number = 1,
    maxHours: number = 168,
  ): PriceCalculation {
    this.validateDuration(hours, minHours, maxHours);

    const subtotal = pricePerHour * BigInt(hours);
    const feeRate = this.configService.get<number>('platform.feeRate', 0.05);
    const platformFee = BigInt(Math.floor(Number(subtotal) * feeRate));
    const totalAmount = subtotal + platformFee;

    return {
      pricePerHour,
      duration: hours,
      isPermanent: false,
      subtotal,
      platformFee,
      totalAmount,
      feeRate,
    };
  }

  calculatePermanentPrice(pricePermanent: bigint): PriceCalculation {
    const feeRate = this.configService.get<number>('platform.feeRate', 0.05);
    const platformFee = BigInt(Math.floor(Number(pricePermanent) * feeRate));
    const totalAmount = pricePermanent + platformFee;

    return {
      pricePerHour: BigInt(0),
      duration: null,
      isPermanent: true,
      subtotal: pricePermanent,
      platformFee,
      totalAmount,
      feeRate,
    };
  }

  validatePublishTime(
    requestedTime: Date,
    publishTimeStart: string | null,
    publishTimeEnd: string | null,
    timezone: string = 'UTC',
  ): void {
    if (!publishTimeStart || !publishTimeEnd) return;

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const requestedHHMM = formatter.format(requestedTime);

    if (requestedHHMM < publishTimeStart || requestedHHMM > publishTimeEnd) {
      throw new BadRequestException(
        `Publication time must be between ${publishTimeStart} and ${publishTimeEnd} (${timezone})`,
      );
    }
  }

  validateDuration(
    duration: number,
    minHours: number,
    maxHours: number,
  ): void {
    if (!Number.isInteger(duration) || duration < minHours || duration > maxHours) {
      throw new BadRequestException(
        `Duration must be between ${minHours} and ${maxHours} hours`,
      );
    }
  }
}
