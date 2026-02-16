import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(@CurrentUser() user: User, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.favoritesService.getFavorites(user.id, +page, +limit);
  }

  @Get('ids')
  async getFavoriteIds(@CurrentUser() user: User) {
    return this.favoritesService.getFavoriteIds(user.id);
  }

  @Get('check/:channelId')
  async checkFavorite(@CurrentUser() user: User, @Param('channelId') channelId: string) {
    const isFavorite = await this.favoritesService.isFavorite(user.id, channelId);
    return { isFavorite };
  }

  @Post(':channelId')
  async addFavorite(@CurrentUser() user: User, @Param('channelId') channelId: string) {
    await this.favoritesService.addFavorite(user.id, channelId);
    return { success: true };
  }

  @Delete(':channelId')
  async removeFavorite(@CurrentUser() user: User, @Param('channelId') channelId: string) {
    await this.favoritesService.removeFavorite(user.id, channelId);
    return { success: true };
  }
}
