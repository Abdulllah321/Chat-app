import { createContext, useEffect, useState } from "react";
import authService from "./services/authService";

export const UserContext = createContext({});

export default function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setId(user.id);
      setUsername(user.username);
    }
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}
