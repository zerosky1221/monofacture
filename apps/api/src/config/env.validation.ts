import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, IsUrl, Min, Max, IsEnum, MinLength } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '1d';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  TELEGRAM_BOT_TOKEN!: string;

  @IsString()
  @IsOptional()
  TELEGRAM_BOT_USERNAME?: string;

  @IsString()
  @IsOptional()
  TELEGRAM_USE_WEBHOOK?: string;

  @IsString()
  @IsOptional()
  TELEGRAM_WEBHOOK_URL?: string;

  @IsString()
  @IsOptional()
  TELEGRAM_WEBHOOK_SECRET_TOKEN?: string;

  @IsString()
  @IsOptional()
  TON_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  TON_API_KEY?: string;

  @IsUrl()
  @IsOptional()
  TON_CONNECT_MANIFEST_URL?: string;

  @IsUrl()
  @IsOptional()
  WEBAPP_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
