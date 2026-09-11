import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithHeader(authorization?: string): ExecutionContext {
  const request: Record<string, unknown> = { headers: { authorization } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let jwtService: jest.Mocked<JwtService>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    guard = new JwtAuthGuard(jwtService);
  });

  it('rechaza sin header de autorización', async () => {
    await expect(guard.canActivate(contextWithHeader(undefined))).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un header que no es Bearer', async () => {
    await expect(guard.canActivate(contextWithHeader('Basic algo'))).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token inválido o expirado', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(guard.canActivate(contextWithHeader('Bearer feo'))).rejects.toThrow(UnauthorizedException);
  });

  it('acepta un token válido y adjunta el usuario al request', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@a.com' });
    const context = contextWithHeader('Bearer valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<{ user: { id: string; email: string } }>();
    expect(request.user).toEqual({ id: 'user-1', email: 'a@a.com' });
  });
});
