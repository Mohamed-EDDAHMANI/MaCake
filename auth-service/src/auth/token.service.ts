import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  generateAccessToken(payload: any): string {
    const secret = this.config.get('JWT_SECRET');
    this.logger.log(`Generating access token with secret: ${secret}`);
    const token = this.jwtService.sign(payload, {
      expiresIn: this.config.get('ACCESS_TOKEN_EXPIRES', '7d'),
    });
    this.logger.log(`Token generated successfully`);
    return token;
  }

  generateRefreshToken(payload: any): string {
    const secret = this.config.get('JWT_SECRET');
    this.logger.log(`Generating refresh token with secret: ${secret?.substring(0, 10)}...`);
    const token = this.jwtService.sign(payload, {
      expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES', '30d'),
    });
    this.logger.log(`Refresh token generated successfully`);
    return token;
  }
}