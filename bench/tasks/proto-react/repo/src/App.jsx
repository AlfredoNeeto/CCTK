import { Routes, Route } from 'react-router-dom';

// As telas do protótipo aprovado (prototipo/) entram aqui.
export default function App() {
  return (
    <Routes>
      <Route path="*" element={<p>Em construção</p>} />
    </Routes>
  );
}
