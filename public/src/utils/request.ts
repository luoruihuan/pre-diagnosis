import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { message, Modal } from 'antd';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：注入 Bearer JWT
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;

    // 如果后端返回的是标准格式 { code, message, data }
    if (data.code !== undefined) {
      if (data.code === 0 || data.code === 200) {
        return data.data;
      } else {
        message.error(data.message || '请求失败');
        return Promise.reject(new Error(data.message || '请求失败'));
      }
    }

    // 直接返回数据
    return data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401: {
          const errorData = error.response?.data;
          const errorType = errorData?.data?.type || errorData?.type;

          // 登录页的 401 直接往上抛，让登录页显示"用户名或密码错误"
          if (window.location.pathname === '/login') {
            message.error(errorData?.message || '用户名或密码错误');
            break;
          }

          if (
            errorType === 'OCEAN_ENGINE_UNAUTHORIZED' ||
            errorType === 'OCEAN_ENGINE_TOKEN_EXPIRED'
          ) {
            Modal.confirm({
              title: '巨量引擎授权',
              content:
                errorType === 'OCEAN_ENGINE_UNAUTHORIZED'
                  ? '当前功能需要先完成巨量引擎 OAuth 授权，是否立即前往授权？'
                  : '巨量引擎授权已过期，需要重新授权，是否立即前往？',
              okText: '立即授权',
              cancelText: '稍后再说',
              onOk: () => {
                window.location.href = '/api/auth/ocean-engine/authorize';
              },
            });
          } else {
            message.error('登录已过期，请重新登录');
            localStorage.removeItem('access_token');
            window.location.href = '/login';
          }
          break;
        }
        case 403:
          message.error('拒绝访问');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器错误');
          break;
        default:
          message.error(data?.message || '网络请求失败，请稍后重试');
      }
    } else if (error.request) {
      message.error('网络请求失败，请检查网络连接');
    } else {
      message.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

export default request;
