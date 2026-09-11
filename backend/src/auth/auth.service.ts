import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      throw new ConflictException('ya existe una cuenta con ese email');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.save(this.userRepo.create({ email, passwordHash }));
    return this.signToken(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('credenciales inválidas');
    }
    return this.signToken(user.id, user.email);
  }

  private signToken(sub: string, email: string) {
    return { accessToken: this.jwtService.sign({ sub, email }) };
  }
}
