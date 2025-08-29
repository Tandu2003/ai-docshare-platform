import { Can } from '@casl/react';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { apiClient } from '@/utils/api-client';

interface CaslContextType {
  ability: any;
  user: any;
  can: (action: string, subject: string, field?: string, conditions?: any) => boolean;
  isLoading: boolean;
}

const CaslContext = createContext<CaslContextType | null>(null);

interface CaslProviderProps {
  children: ReactNode;
  user: any;
}

export function CaslProvider({ children, user }: CaslProviderProps) {
  const [ability, setAbility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user abilities from backend
  useEffect(() => {
    const fetchAbilities = async () => {
      try {
        if (user) {
          console.log('🔐 Fetching abilities for user:', user);
          // Call backend to get user abilities
          const response = await apiClient.get('/auth/abilities');
          console.log('🔐 Backend abilities response:', response.data);
          setAbility(response.data);
        } else {
          console.log('🔐 No user, setting default abilities');
          setAbility({ rules: [] });
        }
      } catch (error) {
        console.error('🔐 Error fetching abilities:', error);
        // Fallback to default abilities
        setAbility({ rules: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAbilities();
  }, [user]);

  const can = (action: string, subject: string, field?: string, conditions?: any) => {
    if (!ability || !ability.rules) {
      console.log('🔐 No ability rules available');
      return false;
    }

    // Simple permission check based on backend rules
    // This is a simplified version - in production, you'd want more sophisticated logic
    const hasPermission = ability.rules.some((rule: any) => {
      return rule.action === action && rule.subject === subject;
    });

    console.log('🔐 CASL Debug:', {
      action,
      subject,
      field,
      conditions,
      user: user
        ? `${user.firstName} ${user.lastName} (${user.role?.name || 'no-role'})`
        : 'not authenticated',
      hasPermission,
      abilityRules: ability.rules,
      ruleCount: ability.rules.length,
    });

    return hasPermission;
  };

  const value: CaslContextType = {
    ability,
    user,
    can,
    isLoading,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải quyền...</p>
        </div>
      </div>
    );
  }

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
  I?: string;
  do?: string;
  on: string;
  this?: any;
  children: ReactNode;
}) {
  const { ability } = useCasl();
  const finalAction = action ?? I;
  return (
    <Can ability={ability} do={finalAction as any} on={subject as any} this={conditions}>
      {children}
    </Can>
  );
}

// Custom hook for checking permissions
export function useCan(action: string, subject: string, field?: string, conditions?: any) {
  const { can } = useCasl();
  return can(action, subject, field, conditions);
}
