import React, { createContext, useContext, useState } from 'react';

type Role = 'owner' | 'renter' | null;

type UserContextType = {
  userRole: Role;
  setUserRole: (role: Role) => void;
};

const UserContext = createContext<UserContextType>({
  userRole: null,
  setUserRole: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<Role>(null);
  return (
    <UserContext.Provider value={{ userRole, setUserRole }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
