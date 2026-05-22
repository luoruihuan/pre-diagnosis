import request from '../utils/request';

export interface LoginResponse {
  access_token: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  return request.post('/auth/login', { username, password });
};
