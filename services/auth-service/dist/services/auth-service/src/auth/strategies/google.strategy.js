var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
let GoogleStrategy = class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(configService, authService) {
        super({
            clientID: configService.get('GOOGLE_CLIENT_ID'),
            clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
        this.configService = configService;
        this.authService = authService;
    }
    async validate(accessToken, refreshToken, profile) {
        const { name, emails, photos } = profile;
        const oauthProfile = {
            provider: 'google',
            id: profile.id,
            email: emails[0].value,
            name: name.givenName + ' ' + name.familyName,
            avatar: photos[0].value,
        };
        const user = await this.authService.validateOAuthProfile(oauthProfile);
        return user;
    }
};
GoogleStrategy = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService,
        AuthService])
], GoogleStrategy);
export { GoogleStrategy };
