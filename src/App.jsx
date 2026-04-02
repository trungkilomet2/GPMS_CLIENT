import { Suspense } from 'react';
import { routes } from '@/routes';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfileCompletionGuard from '@/routes/ProfileCompletionGuard';
import { ToastContainer } from 'react-toastify';
import ChatWidget from '@/components/ChatWidget';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-xl">Đang tải...</div>}>
          <ProfileCompletionGuard>
            <Routes>
              {routes.map((route, index) => (
                <Route key={index} path={route.path} element={route.element} />
              ))}
            </Routes>
          </ProfileCompletionGuard>
        </Suspense>
      </BrowserRouter>
      <ChatWidget />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
