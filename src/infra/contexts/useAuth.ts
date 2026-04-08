import { useContext } from 'react';

import { AuthContext, type AuthContextType } from './AuthContext';

export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
};
