import { Suspense, useEffect } from 'react';
import { routes } from '@/routes';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { consumeAuthHandoff } from '@/lib/authStorage';

function AuthHandoffBootstrap() {
  const location = useLocation();

  useEffect(() => {
    const consumed = consumeAuthHandoff(location.search);
    if (!consumed) return;

    const params = new URLSearchParams(location.search);
    params.delete('authHandoff');
    const nextSearch = params.toString();
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    window.dispatchEvent(new Event('auth-change'));
  }, [location.hash, location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthHandoffBootstrap />
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-xl">Đang tải...</div>}>
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
