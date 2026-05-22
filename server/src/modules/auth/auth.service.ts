import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<{ id: string; username: string }> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return { id: user.id, username: user.username };
  }

  async login(username: string, password: string): Promise<{ access_token: string; expires_in: number }> {
    const user = await this.validateUser(username, password);

    const payload = { sub: user.id, username: user.username };
    const expiresIn = 8 * 60 * 60; // 8 小时（秒）

    const access_token = this.jwtService.sign(payload);

    return { access_token, expires_in: expiresIn };
  }
}
