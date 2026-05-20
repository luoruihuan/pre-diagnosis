import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { message } from 'antd';

// API Key（开发环境使用默认值，生产环境从环境变量读取）
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-api-key-12345';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY, // 添加 API Key 认证
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 确保每个请求都带上 API Key
    if (!config.headers['X-API-Key']) {
      config.headers['X-API-Key'] = API_KEY;
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
        case 401:
          message.error('未授权，请重新登录');
          // 可以跳转到登录页
          break;
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
