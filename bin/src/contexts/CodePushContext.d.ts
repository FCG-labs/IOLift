import React, { ReactNode } from 'react';
import { CodePushContextType } from '~/IOLift';
export declare const CodePushProvider: ({ children }: {
    children: ReactNode;
}) => React.JSX.Element;
export declare const useCodePush: () => CodePushContextType;
