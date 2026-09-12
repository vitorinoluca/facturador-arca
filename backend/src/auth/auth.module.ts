import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      // el access token expira en minutos (se define por-sign en auth.service); esto
      // es solo el default del módulo si algún signer no lo especifica
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // TypeOrmModule también se reexporta: JwtAuthGuard ahora valida el usuario contra
  // la base (Repository<User>), y otros módulos lo usan vía @UseGuards(JwtAuthGuard)
  // por referencia de clase — necesitan poder resolver esa dependencia también.
  exports: [JwtAuthGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
