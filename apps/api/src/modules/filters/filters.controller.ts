import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { FiltersService } from './filters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('filters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Get()
  async getSavedFilters(@CurrentUser() user: User) {
    return this.filtersService.getSavedFilters(user.id);
  }

  @Post()
  async createFilter(@CurrentUser() user: User, @Body() body: { name: string; filters: any }) {
    return this.filtersService.createFilter(user.id, body.name, body.filters);
  }

  @Patch(':id')
  async updateFilter(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { name?: string; filters?: any }) {
    return this.filtersService.updateFilter(user.id, id, body.name, body.filters);
  }

  @Delete(':id')
  async deleteFilter(@CurrentUser() user: User, @Param('id') id: string) {
    return this.filtersService.deleteFilter(user.id, id);
  }
}
