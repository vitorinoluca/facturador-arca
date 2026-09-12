import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AfipClientService } from '../afip/afip-client.service';
import { isValidCuit } from '../common/is-valid-cuit';
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
    @Query('environment') environment: 'testing' | 'production' = 'production',
  ) {
    if (!isValidCuit(cuit)) {
      throw new BadRequestException('cuit inválido');
    }
    let result;
    try {
      result = await this.afipClient.lookupTaxpayer(cuit, environment);
    } catch (err) {
      // errores de ARCA (cert no autorizado, CUIT inexistente en el padrón de
      // testing, etc.) no son errores nuestros — se muestran tal cual, no 500
      throw new BadRequestException((err as Error).message);
    }
    if (!result) {
      throw new BadRequestException('ARCA no encontró ese CUIT');
    }
    return result;
  }

  // chequea si el CUIT ya delegó Facturación Electrónica en el CUIT de la app antes
  // de dejar avanzar al resto del formulario de alta
  @Get('delegation/:cuit')
  async checkDelegation(
    @Param('cuit') cuit: string,
    @Query('environment') environment: 'testing' | 'production' = 'production',
  ) {
    if (!isValidCuit(cuit)) {
      throw new BadRequestException('cuit inválido');
    }
    return this.afipClient.checkDelegation(cuit, environment);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAfipCredentialDto,
  ) {
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
