import { useAuth } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import Login from './Login';
import WaypointApp from './WaypointApp';

export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Login />;

  return (
    <ProfileProvider>
      <WaypointApp />
    </ProfileProvider>
  );
}
