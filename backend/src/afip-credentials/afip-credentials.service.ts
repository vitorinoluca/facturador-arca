import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decrypt, encrypt } from '../common/crypto.util';
import { CreateAfipCredentialDto } from './dto/create-afip-credential.dto';
import { AfipCredential } from './entities/afip-credential.entity';

@Injectable()
export class AfipCredentialsService {
  constructor(@InjectRepository(AfipCredential) private readonly repo: Repository<AfipCredential>) {}

  async create(userId: string, dto: CreateAfipCredentialDto) {
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
        certEncrypted: encrypt(dto.cert),
        keyEncrypted: encrypt(dto.key),
        environment: dto.environment ?? 'testing',
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

  // uso interno del módulo de invoices: nunca se expone cert/key por HTTP
  async getDecrypted(userId: string, credentialId: string) {
    const row = await this.repo.findOneBy({ id: credentialId, userId });
    if (!row) return null;
    return {
      cuit: row.cuit,
      cert: decrypt(row.certEncrypted),
      key: decrypt(row.keyEncrypted),
      environment: row.environment,
      businessName: row.businessName,
      address: row.address,
      grossIncome: row.grossIncome,
      activityStartDate: row.activityStartDate,
    };
  }
}
