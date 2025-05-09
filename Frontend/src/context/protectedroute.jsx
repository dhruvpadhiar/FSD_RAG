import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';

const ProtectedRoute = ({ children }) => {
  const { authData } = useContext(AuthContext);

  if (!authData) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
