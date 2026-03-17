import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const userStr = localStorage.getItem('mockprep_user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!user || user.role !== 'ADMIN') {
    // If no user or not an admin, redirect to the login or home page
    return <Navigate to="/login" replace />;
  }

  // If user is an admin, render the child routes
  return <Outlet />;
};

export default AdminRoute;
