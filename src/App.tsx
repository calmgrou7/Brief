import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './state';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import { Practice } from './pages/Practice';
import { ProblemPage } from './pages/ProblemPage';
import { Duel } from './pages/Duel';
import { Ranking } from './pages/Ranking';
import { Lab } from './pages/Lab';
import { Profile } from './pages/Profile';

function Routed() {
  const { user, ready, t } = useApp();
  if (!ready) return <div className="splash"><img src="./logo.svg" width={72} height={72} alt="" className="logo" /><p className="muted">{t.common.loading}</p></div>;
  if (!user) return <Auth />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="practice" element={<Practice />} />
        <Route path="practice/:id" element={<ProblemPage />} />
        <Route path="duel" element={<Duel />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="lab" element={<Lab />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter><Routed /></HashRouter>
    </AppProvider>
  );
}
