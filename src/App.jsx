import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login         from './pages/Login.jsx';
import Signup        from './pages/Signup.jsx';
import AdminOverview from './pages/AdminOverview.jsx';
import Activity      from './pages/Activity.jsx';
import Finance       from './pages/Finance.jsx';
import Donations     from './pages/Donations.jsx';
import Expenses      from './pages/Expenses.jsx';
import Budgets       from './pages/Budgets.jsx';
import Reports       from './pages/Reports.jsx';
import Members       from './pages/Members.jsx';
import Families      from './pages/Families.jsx';
import Workers       from './pages/Workers.jsx';
import Campaigns     from './pages/Campaigns.jsx';
import SocialMedia   from './pages/SocialMedia.jsx';
import Classes       from './pages/Classes.jsx';
import Lessons       from './pages/Lessons.jsx';
import Teachers      from './pages/Teachers.jsx';
import Attendance    from './pages/Attendance.jsx';
import Engagement    from './pages/Engagement.jsx';
import Approvals     from './pages/Approvals.jsx';
import Marks         from './pages/Marks.jsx';
import Certificates  from './pages/Certificates.jsx';
import Branches      from './pages/Branches.jsx';
import Team          from './pages/Team.jsx';
import Settings      from './pages/Settings.jsx';

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
        <Route index            element={<AdminOverview />} />
        <Route path="activity"  element={<Activity />} />
        <Route path="finance"   element={<Finance />} />
        <Route path="donations" element={<Donations />} />
        <Route path="expenses"  element={<Expenses />} />
        <Route path="budgets"   element={<Budgets />} />
        <Route path="reports"   element={<Reports />} />
        <Route path="members"   element={<Members />} />
        <Route path="families"  element={<Families />} />
        <Route path="workers"   element={<Workers />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="social"    element={<SocialMedia />} />
        <Route path="classes"      element={<Classes />} />
        <Route path="lessons"      element={<Lessons />} />
        <Route path="teachers"     element={<Teachers />} />
        <Route path="attendance"   element={<Attendance />} />
        <Route path="engagement"   element={<Engagement />} />
        <Route path="approvals"    element={<Approvals />} />
        <Route path="marks"        element={<Marks />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="branches"  element={<Branches />} />
        <Route path="team"      element={<Team />} />
        <Route path="settings"  element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
