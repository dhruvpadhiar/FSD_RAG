import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import  {jwtDecode} from 'jwt-decode'; 
import Cookies from 'js-cookie';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get('authToken');
    if (token) {
      console.log('Token found');
      const decodedToken = jwtDecode(token);
      setAuthData(decodedToken);
    }
  }, []);

  const login = (token) => {
    console.log('Logging in with token:', token);
    Cookies.set('authToken', token, { expires: 2 }); // token expires in 1 day
    const decodedToken = jwtDecode(token);
    setAuthData(decodedToken);
    navigate('/dashboard');
  };

  const logout = () => {
    console.log('Logging out');
    Cookies.remove('authToken');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ authData, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
