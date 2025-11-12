
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as userModelRepo from '../db/userModelRepository';

interface UserModelContextType {
  modelImageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  saveModel: (imageUrl: string) => Promise<void>;
  deleteModel: () => Promise<void>;
}

const UserModelContext = createContext<UserModelContextType | undefined>(undefined);

export const UserModelProvider = ({ children }: { children: ReactNode }) => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadModel = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedModelUrl = await userModelRepo.getUserModel();
      setModelImageUrl(fetchedModelUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load user model'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const saveModel = async (imageUrl: string) => {
    await userModelRepo.saveUserModel(imageUrl);
    setModelImageUrl(imageUrl);
  };

  const deleteModel = async () => {
    await userModelRepo.deleteUserModel();
    setModelImageUrl(null);
  };

  const value = { modelImageUrl, isLoading, error, saveModel, deleteModel };

  return (
    <UserModelContext.Provider value={value}>
      {children}
    </UserModelContext.Provider>
  );
};

export const useUserModel = (): UserModelContextType => {
  const context = useContext(UserModelContext);
  if (context === undefined) {
    throw new Error('useUserModel must be used within a UserModelProvider');
  }
  return context;
};
