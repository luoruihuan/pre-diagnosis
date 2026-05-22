import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

const REDIRECT_DELAY_MS = 3000;

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // 后端重定向参数：?ocean_engine_auth=success 或 ?ocean_engine_auth=error&reason=xxx
  const authResult = searchParams.get('ocean_engine_auth');
  const success = authResult === 'success';
  const error = searchParams.get('reason');

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/base/system');
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f5f5',
      }}
    >
      {success ? (
        <Result
          status="success"
          title="授权成功"
          subTitle="巨量引擎 OAuth 授权已完成，3 秒后自动跳转..."
          extra={
            <Button type="primary" onClick={() => navigate('/base/system')}>
              立即跳转
            </Button>
          }
        />
      ) : (
        <Result
          status="error"
          title="授权失败"
          subTitle={error ? decodeURIComponent(error) : '授权过程中发生错误'}
          extra={
            <Button type="primary" onClick={() => navigate('/base/system')}>
              返回重试
            </Button>
          }
        />
      )}
    </div>
  );
};

export default OAuthCallback;
