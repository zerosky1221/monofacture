import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { StatsRecalculationService } from './stats-recalculation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { UpdateUserDto, ConnectWalletDto, UserFiltersDto, UserResponseDto } from './dto/users.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly statsService: StatsRecalculationService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated user', type: UserResponseDto })
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto);
  }

  @Get('me/statistics')
  @ApiOperation({ summary: 'Get current user statistics' })
  async getMyStatistics(@CurrentUser() user: User) {
    return this.usersService.getStatistics(user.id);
  }

  @Patch('me/wallet')
  @ApiOperation({ summary: 'Connect TON wallet' })
  @ApiResponse({ status: 200, description: 'Wallet connected', type: UserResponseDto })
  async connectWallet(@CurrentUser() user: User, @Body() dto: ConnectWalletDto) {
    return this.usersService.connectWallet(user.id, dto);
  }

  @Delete('me/wallet/:address')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect TON wallet' })
  @ApiParam({ name: 'address', description: 'Wallet address to disconnect' })
  async disconnectWallet(
    @CurrentUser() user: User,
    @Param('address') address: string,
  ) {
    await this.usersService.disconnectWallet(user.id, address);
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiPaginatedResponse(UserResponseDto)
  async findAll(@Query() filters: UserFiltersDto) {
    return this.usersService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/statistics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user statistics (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getStatistics(@Param('id') id: string) {
    return this.usersService.getStatistics(id);
  }

  @Patch(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add role to user (super admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'role', enum: UserRole, description: 'Role to add' })
  async addRole(
    @Param('id') id: string,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.addRole(id, role);
  }

  @Delete(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove role from user (super admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'role', enum: UserRole, description: 'Role to remove' })
  async removeRole(
    @Param('id') id: string,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.removeRole(id, role);
  }

  @Post('admin/recalculate-stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate all user and channel statistics (admin only)' })
  async recalculateAllStats() {
    return this.statsService.recalculateAll();
  }

  @Post(':id/recalculate-stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate single user statistics (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async recalculateUserStats(@Param('id') id: string) {
    await this.statsService.recalculateUserStats(id);
    return { success: true, userId: id };
  }
}
