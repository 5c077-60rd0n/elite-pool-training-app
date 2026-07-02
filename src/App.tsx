import { BrowserRouter } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-felt-900 text-ivory-100">
        <Header />
        <AppRouter />
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
