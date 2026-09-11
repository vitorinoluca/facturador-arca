import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithCookie(accessToken?: string): ExecutionContext {
  const request: Record<string, unknown> = { cookies: accessToken ? { access_token: accessToken } : {} };
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

  it('rechaza sin cookie de access_token', async () => {
    await expect(guard.canActivate(contextWithCookie())).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token inválido o expirado', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(guard.canActivate(contextWithCookie('feo'))).rejects.toThrow(UnauthorizedException);
  });

  it('acepta un token válido y adjunta el usuario al request', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@a.com' });
    const context = contextWithCookie('valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<{ user: { id: string; email: string } }>();
    expect(request.user).toEqual({ id: 'user-1', email: 'a@a.com' });
  });
});
