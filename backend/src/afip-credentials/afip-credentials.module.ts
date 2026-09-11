import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AfipClientService } from '../afip/afip-client.service';
import { AuthModule } from '../auth/auth.module';
import { AfipCredentialsController } from './afip-credentials.controller';
import { AfipCredentialsService } from './afip-credentials.service';
import { AfipCredential } from './entities/afip-credential.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AfipCredential]), AuthModule],
  controllers: [AfipCredentialsController],
  providers: [AfipCredentialsService, AfipClientService],
  exports: [AfipCredentialsService],
})
export class AfipCredentialsModule {}
