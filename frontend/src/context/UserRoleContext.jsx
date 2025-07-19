import { createContext, useContext, useState } from 'react';

const UserRoleContext = createContext();

export const UserRoleProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(() => {
    const storedRole = localStorage.getItem('userRole');
    // Convert to number if valid, otherwise null
    return storedRole ? Number(storedRole) : null;
  });

  const fetchUserRole = (role_id) => {
    // Ensure role_id is a valid number
    const roleId = Number(role_id);
    if (!isNaN(roleId)) {
      setUserRole(roleId);
      localStorage.setItem('userRole', roleId.toString());
    } else {
      console.error('Invalid role_id received:', role_id);
      setUserRole(null);
      localStorage.removeItem('userRole');
    }
  };

  const clearUserRole = () => {
    setUserRole(null);
    localStorage.removeItem('userRole');
  };

  return (
    <UserRoleContext.Provider value={{ userRole, fetchUserRole, clearUserRole }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => useContext(UserRoleContext);
