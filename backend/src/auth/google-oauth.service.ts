import { Injectable, UnauthorizedException } from '@nestjs/common';

// Flujo manual de OAuth2 Authorization Code — no hace falta @nestjs/passport ni
// passport-google-oauth20 para dos llamados HTTP (intercambiar el code, pedir el
// userinfo). El resto del proyecto tampoco usa passport, así que esto sigue el
// mismo estilo que afip-client.service.ts.
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  googleId: string; // el "sub" — estable, a diferencia del email
  email: string;
  emailVerified: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no está configurado en el servidor`);
  }
  return value;
}

@Injectable()
export class GoogleOAuthService {
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: 'openid email',
      state,
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: requireEnv('GOOGLE_CLIENT_ID'),
        client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      throw new UnauthorizedException(
        'Google rechazó el código de autorización',
      );
    }
    const { access_token: accessToken } = (await tokenRes.json()) as {
      access_token: string;
    };

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      throw new UnauthorizedException('no se pudo obtener el perfil de Google');
    }
    const profile = (await profileRes.json()) as {
      sub: string;
      email: string;
      email_verified: boolean;
    };

    return {
      googleId: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified,
    };
  }
}
