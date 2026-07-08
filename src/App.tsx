import { BrowserRouter } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { PwaExperience } from './components/pwa/PwaExperience';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-felt-900 text-ivory-100 selection:bg-cue-500/30">
        <Header />
        <AppRouter />
        <BottomNav />
        <PwaExperience />
      </div>
    </BrowserRouter>
  );
}

export default App;
