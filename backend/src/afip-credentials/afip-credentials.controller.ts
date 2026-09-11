import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AfipCredentialsService } from './afip-credentials.service';
import { CreateAfipCredentialDto } from './dto/create-afip-credential.dto';

@ApiTags('afip-credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('afip-credentials')
export class AfipCredentialsController {
  constructor(private readonly service: AfipCredentialsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAfipCredentialDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findForUser(user.id);
  }
}
