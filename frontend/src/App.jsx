import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGate from './pages/AuthGate';
import AuthVerify from './pages/AuthVerify';
import JoinTrip from './pages/JoinTrip';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth/verify" element={<AuthVerify />} />
          <Route path="/join/:code" element={<JoinTrip />} />
          <Route path="/*" element={<AuthGate />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
