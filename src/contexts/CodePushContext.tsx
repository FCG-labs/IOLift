import React, { createContext, ReactNode, useContext, useState } from 'react';
import IOLift, { CodePushContextType } from '~/IOLift';

const CodePushContext = createContext<CodePushContextType | undefined>(undefined);

export const CodePushProvider = ({ children }: { children: ReactNode }) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // 업데이트 체크 함수
  const checkUpdate = async () => {
    try {
      const remotePackage = await IOLift.checkForUpdate();
      if (remotePackage && remotePackage.isMandatory !== undefined) {
        setIsUpdateAvailable(true);
        setUpdateInfo(remotePackage);
      } else {
        setIsUpdateAvailable(false);
        setUpdateInfo(null);
      }
    } catch (e) {
      setIsUpdateAvailable(false);
      setUpdateInfo(null);
    }
  };

  // 업데이트 적용 함수
  const applyUpdate = async () => {
    await IOLift.sync({
      installMode: IOLift.InstallMode.IMMEDIATE,
    });
  };

  return (
    <CodePushContext.Provider value={{
      isUpdateAvailable,
      updateInfo,
      checkUpdate,
      applyUpdate,
    }}>
      {children}
    </CodePushContext.Provider>
  );
};

export const useCodePush = () => {
  const context = useContext(CodePushContext);
  if (context === undefined) {
    throw new Error('useCodePush must be used within a CodePushProvider');
  }
  return context;
};
