import { Can } from '@casl/react';

import { ReactNode, createContext, useContext } from 'react';

import { AbilityFactory, AppAbility, User } from './ability.factory';

interface CaslContextType {
  ability: AppAbility;
  user: User | null;
  can: (action: string, subject: string, conditions?: any) => boolean;
}

const CaslContext = createContext<CaslContextType | null>(null);

interface CaslProviderProps {
  children: ReactNode;
  user: User | null;
}

export function CaslProvider({ children, user }: CaslProviderProps) {
  const ability = AbilityFactory.createForUser(user);

  const can = (action: string, subject: string, conditions?: any) => {
    return ability.can(action as any, subject as any, conditions);
  };

  const value: CaslContextType = {
    ability,
    user,
    can,
  };

  return <CaslContext.Provider value={value}>{children}</CaslContext.Provider>;
}

export function useCasl() {
  const context = useContext(CaslContext);
  if (!context) {
    throw new Error('useCasl must be used within a CaslProvider');
  }
  return context;
}

// Higher-order component for conditional rendering based on permissions
export function CanComponent({
  I,
  do: action,
  on: subject,
  this: conditions,
  children,
}: {
  I: string;
  do: string;
  on: string;
  this?: any;
  children: ReactNode;
}) {
  const { ability } = useCasl();
  return (
    <Can ability={ability} I={I} do={action} on={subject} this={conditions}>
      {children}
    </Can>
  );
}

// Custom hook for checking permissions
export function useCan(action: string, subject: string, conditions?: any) {
  const { can } = useCasl();
  return can(action, subject, conditions);
}
