import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ItemsProvider } from './hooks/ItemsContext';
import { BottomNavigation } from './components/BottomNavigation';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import ArchivePage from './pages/ArchivePage';
import ItemFormPage from './pages/ItemFormPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <ItemsProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/items/new" element={<ItemFormPage />} />
            <Route path="/items/:id/edit" element={<ItemFormPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/archive" element={<ArchivePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ItemsProvider>
  );
}

export default App;
