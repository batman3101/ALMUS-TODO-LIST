var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, } from "@almus/shared-types";
let AuthService = class AuthService {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async validateUser(email) {
        // TODO: 실제 데이터베이스에서 사용자 조회
        // 임시로 하드코딩된 사용자 반환
        return {
            id: '1',
            email,
            name: 'Test User',
            role: UserRole.ADMIN,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async login(email) {
        const user = await this.validateUser(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        return {
            accessToken,
            refreshToken,
            user,
        };
    }
    async validateOAuthProfile(profile) {
        // TODO: OAuth 프로필을 기반으로 사용자 생성 또는 업데이트
        return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: UserRole.EDITOR,
            avatar: profile.avatar,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async refreshToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            const user = await this.validateUser(payload.email);
            if (!user) {
                throw new UnauthorizedException('Invalid token');
            }
            const newPayload = {
                userId: user.id,
                email: user.email,
                role: user.role,
            };
            const accessToken = this.jwtService.sign(newPayload);
            const refreshToken = this.jwtService.sign(newPayload, {
                expiresIn: '7d',
            });
            return {
                accessToken,
                refreshToken,
                user,
            };
        }
        catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
};
AuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JwtService])
], AuthService);
export { AuthService };
