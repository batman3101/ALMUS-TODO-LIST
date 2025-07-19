import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { OAuthProfile } from '@almus/shared-types';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.get<string>('MICROSOFT_CALLBACK_URL'),
      scope: ['user.read'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any
  ): Promise<any> {
    const { name, emails, photos } = profile;

    const oauthProfile: OAuthProfile = {
      provider: 'microsoft',
      id: profile.id,
      email: emails[0].value,
      name: name.givenName + ' ' + name.familyName,
      avatar: photos?.[0]?.value,
    };

    const user = await this.authService.validateOAuthProfile(oauthProfile);
    return user;
  }
}
