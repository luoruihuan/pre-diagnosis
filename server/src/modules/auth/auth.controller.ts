import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { OceanEngineTokenService } from '../ocean-engine/ocean-engine-token.service';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oceanEngineTokenService: OceanEngineTokenService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录', description: '使用用户名和密码登录，返回 JWT Token' })
  @ApiResponse({ status: 200, description: '登录成功，返回 access_token' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  // ─── 巨量引擎 OAuth ──────────────────────────────────────────────────────────

  /**
   * GET /auth/ocean-engine/authorize
   * 生成巨量引擎授权 URL 并重定向（无需 JWT）
   */
  @Public()
  @Get('ocean-engine/authorize')
  @ApiOperation({ summary: '巨量引擎 OAuth 授权', description: '重定向到巨量引擎授权页面' })
  async authorize(@Res() res: Response) {
    const url = await this.oceanEngineTokenService.buildAuthUrl();
    res.redirect(url);
  }

  /**
   * GET /auth/ocean-engine/callback
   * 接收巨量引擎回调的 auth_code，换取 token 后重定向到前端（无需 JWT）
   */
  @Public()
  @Get('ocean-engine/callback')
  @ApiOperation({ summary: '巨量引擎 OAuth 回调', description: '接收 auth_code 并换取 token' })
  async callback(
    @Query('auth_code') authCode: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendCallback = this.oceanEngineTokenService.frontendCallback;

    try {
      // 验证 state 防 CSRF
      if (!state || !(await this.oceanEngineTokenService.verifyState(state))) {
        return res.redirect(
          `${frontendCallback}?ocean_engine_auth=error&reason=invalid_state`,
        );
      }

      if (!authCode) {
        return res.redirect(
          `${frontendCallback}?ocean_engine_auth=error&reason=missing_auth_code`,
        );
      }

      await this.oceanEngineTokenService.exchangeAuthCode(authCode);
      return res.redirect(`${frontendCallback}?ocean_engine_auth=success`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? encodeURIComponent(err.message) : 'unknown';
      return res.redirect(
        `${frontendCallback}?ocean_engine_auth=error&reason=${message}`,
      );
    }
  }

  /**
   * GET /auth/ocean-engine/status
   * 查询授权状态（需要 JWT 认证）
   */
  @Get('ocean-engine/status')
  @ApiOperation({ summary: '查询巨量引擎授权状态' })
  @ApiResponse({ status: 200, description: '返回授权状态和 token 过期信息' })
  async status() {
    return this.oceanEngineTokenService.getAuthStatus();
  }

  /**
   * DELETE /auth/ocean-engine/revoke
   * 撤销授权，清除 Redis 中的 token（需要 JWT 认证）
   */
  @Delete('ocean-engine/revoke')
  @ApiOperation({ summary: '撤销巨量引擎授权' })
  @ApiResponse({ status: 200, description: '授权已撤销' })
  async revoke() {
    await this.oceanEngineTokenService.revokeTokens();
    return { message: '巨量引擎授权已撤销' };
  }
}
