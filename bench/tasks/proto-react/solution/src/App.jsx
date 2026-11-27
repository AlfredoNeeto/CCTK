import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './telas/Login.jsx';
import Contas from './telas/Contas.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/contas" element={<Contas />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
