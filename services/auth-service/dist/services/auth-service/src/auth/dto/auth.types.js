var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ObjectType, Field, InputType } from '@nestjs/graphql';
let LoginResponseType = class LoginResponseType {
};
__decorate([
    Field(),
    __metadata("design:type", String)
], LoginResponseType.prototype, "accessToken", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], LoginResponseType.prototype, "refreshToken", void 0);
__decorate([
    Field(),
    __metadata("design:type", UserType)
], LoginResponseType.prototype, "user", void 0);
LoginResponseType = __decorate([
    ObjectType()
], LoginResponseType);
export { LoginResponseType };
let UserType = class UserType {
};
__decorate([
    Field(),
    __metadata("design:type", String)
], UserType.prototype, "id", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], UserType.prototype, "email", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], UserType.prototype, "name", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], UserType.prototype, "role", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], UserType.prototype, "avatar", void 0);
__decorate([
    Field(),
    __metadata("design:type", Date)
], UserType.prototype, "createdAt", void 0);
__decorate([
    Field(),
    __metadata("design:type", Date)
], UserType.prototype, "updatedAt", void 0);
UserType = __decorate([
    ObjectType()
], UserType);
export { UserType };
let LoginInputType = class LoginInputType {
};
__decorate([
    Field(),
    __metadata("design:type", String)
], LoginInputType.prototype, "email", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], LoginInputType.prototype, "password", void 0);
LoginInputType = __decorate([
    InputType()
], LoginInputType);
export { LoginInputType };
