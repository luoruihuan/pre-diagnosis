import { makeAutoObservable } from 'mobx';
import { login as loginService } from '../services/auth';

class AuthStore {
  token: string | null = localStorage.getItem('access_token');

  constructor() {
    makeAutoObservable(this);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  setToken(token: string): void {
    localStorage.setItem('access_token', token);
    this.token = token;
  }

  clearToken(): void {
    localStorage.removeItem('access_token');
    this.token = null;
  }

  async login(username: string, password: string): Promise<void> {
    const { access_token } = await loginService(username, password);
    this.setToken(access_token);
  }

  logout(): void {
    this.clearToken();
    window.location.href = '/login';
  }
}

export default new AuthStore();
