import React from 'react';
import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../../stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = observer(({ children }) => {
  if (!authStore.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
});

export default AuthGuard;
