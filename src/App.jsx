import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login      from './pages/Login.jsx';
import Signup     from './pages/Signup.jsx';
import Attendance from './pages/Attendance.jsx';
import Engagement from './pages/Engagement.jsx';
import Lessons    from './pages/Lessons.jsx';
import Teachers   from './pages/Teachers.jsx';
import Approvals  from './pages/Approvals.jsx';

const Guard = ({ children }) => {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index             element={<Attendance />} />
        <Route path="engagement" element={<Engagement />} />
        <Route path="lessons"    element={<Lessons />} />
        <Route path="teachers"   element={<Teachers />} />
        <Route path="approvals"  element={<Approvals />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
