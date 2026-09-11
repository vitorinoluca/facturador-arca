import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AfipClientService } from '../afip/afip-client.service';
import { AfipCredentialsService } from './afip-credentials.service';
import { CreateAfipCredentialDto } from './dto/create-afip-credential.dto';

@ApiTags('afip-credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('afip-credentials')
export class AfipCredentialsController {
  constructor(
    private readonly service: AfipCredentialsService,
    private readonly afipClient: AfipClientService,
  ) {}

  // autocompleta razón social/domicilio/inicio de actividades desde la Constancia de
  // Inscripción de ARCA — así el usuario no los tipea a mano al dar de alta
  @Get('lookup/:cuit')
  async lookup(
    @Param('cuit') cuit: string,
    @Query('environment') environment: 'testing' | 'production' = 'testing',
  ) {
    if (!/^\d{11}$/.test(cuit)) {
      throw new BadRequestException('cuit debe tener 11 dígitos');
    }
    const result = await this.afipClient.lookupTaxpayer(cuit, environment);
    if (!result) {
      throw new BadRequestException('ARCA no encontró ese CUIT');
    }
    return result;
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAfipCredentialDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findForUser(user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
