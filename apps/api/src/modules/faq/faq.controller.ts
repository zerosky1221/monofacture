import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean } from 'class-validator';
import { FaqService } from './faq.service';

class RecordHelpfulDto {
  @IsBoolean()
  helpful: boolean;
}

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all FAQ categories with items' })
  async getCategories() {
    return this.faqService.getCategories();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get FAQ category by slug' })
  async getByCategory(@Param('slug') slug: string) {
    return this.faqService.getByCategory(slug);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search FAQ items' })
  async search(@Query('q') q: string) {
    return this.faqService.search(q);
  }

  @Post('items/:id/helpful')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Record whether a FAQ item was helpful' })
  async recordHelpful(
    @Param('id') id: string,
    @Body() dto: RecordHelpfulDto,
  ) {
    return this.faqService.recordHelpful(id, dto.helpful);
  }

  @Post('items/:id/view')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Increment FAQ item view count' })
  async incrementView(@Param('id') id: string) {
    return this.faqService.incrementView(id);
  }
}
