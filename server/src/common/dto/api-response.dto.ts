import { ApiProperty } from '@nestjs/swagger';

export class ApiResponse<T = any> {
  @ApiProperty({ description: '状态码，0 表示成功' })
  code: number;

  @ApiProperty({ description: '响应消息' })
  message: string;

  @ApiProperty({ description: '响应数据', required: false })
  data?: T;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static success<T>(data?: T, message = 'success'): ApiResponse<T> {
    return new ApiResponse(0, message, data);
  }

  static error(code: number, message: string): ApiResponse {
    return new ApiResponse(code, message, null);
  }
}
