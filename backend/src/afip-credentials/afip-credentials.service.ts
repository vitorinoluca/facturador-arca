import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { CreateAfipCredentialDto } from './dto/create-afip-credential.dto';
import { AfipCredential } from './entities/afip-credential.entity';

@Injectable()
export class AfipCredentialsService {
  constructor(
    @InjectRepository(AfipCredential) private readonly repo: Repository<AfipCredential>,
    private readonly authService: AuthService,
  ) {}

  async create(userId: string, dto: CreateAfipCredentialDto) {
    // sin email verificado no se delega ni se carga nada — se corta acá, antes de
    // tocar ARCA.
    const profile = await this.authService.getProfile(userId);
    if (!profile.emailVerified) {
      throw new ForbiddenException('confirmá tu email antes de delegar la facturación electrónica');
    }

    // ponytail: una credencial por usuario alcanza para el MVP (un monotributista =
    // un CUIT); múltiples credenciales por cuenta se agrega si hace falta manejar
    // varios CUITs desde el mismo login.
    const existing = await this.repo.findOneBy({ userId });
    if (existing) {
      throw new ConflictException('ya tenés una credencial de ARCA cargada');
    }

    const saved = await this.repo.save(
      this.repo.create({
        userId,
        cuit: dto.cuit,
        environment: 'production',
        businessName: dto.businessName,
        address: dto.address,
        grossIncome: dto.grossIncome ?? 'Exento',
        activityStartDate: dto.activityStartDate,
      }),
    );
    return {
      id: saved.id,
      cuit: saved.cuit,
      environment: saved.environment,
      businessName: saved.businessName,
    };
  }

  async findForUser(userId: string) {
    const rows = await this.repo.find({ where: { userId } });
    return rows.map((r) => ({ id: r.id, cuit: r.cuit, environment: r.environment, businessName: r.businessName }));
  }

  async remove(userId: string, credentialId: string) {
    const result = await this.repo.delete({ id: credentialId, userId });
    if (result.affected === 0) {
      throw new NotFoundException('credencial no encontrada');
    }
    return { deleted: true };
  }

  // uso interno del módulo de invoices
  async get(userId: string, credentialId: string) {
    return this.repo.findOneBy({ id: credentialId, userId });
  }
}
