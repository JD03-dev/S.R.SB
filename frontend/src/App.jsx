import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { BookingPage } from './pages/BookingPage.jsx';
import { MyReservationPage } from './pages/MyReservationPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { AuthProvider, RequireAuth } from './admin/AuthProvider.jsx';
import { AccountPage } from './admin/AccountPage.jsx';
import { AdminLayout } from './admin/AdminLayout.jsx';
import { LoginPage } from './admin/LoginPage.jsx';
import { DashboardPage } from './admin/DashboardPage.jsx';
import { ScheduleListPage } from './admin/ScheduleListPage.jsx';
import { ScheduleWeekPage } from './admin/ScheduleWeekPage.jsx';
import { SharePage } from './admin/SharePage.jsx';
import { SettingsPage } from './admin/SettingsPage.jsx';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<BookingPage />} />
          <Route path="reservar/:publicCode" element={<BookingPage />} />
          <Route path="mi-reserva" element={<MyReservationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin/cuenta" element={<AccountPage />} />
        <Route path="admin" element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<ScheduleListPage />} />
            <Route path="agenda/:scheduleId" element={<ScheduleWeekPage />} />
            <Route path="compartir" element={<SharePage />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
