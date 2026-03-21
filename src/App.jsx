import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import MusicPlayer from './components/MusicPlayer';
import NotFound from './views/NotFound';
import RootErrorBoundary from './views/RootErrorBoundary';

// Lazy load views for bundle optimization
const Home = lazy(() => import('./views/Home'));
const Search = lazy(() => import('./views/Search'));
const Library = lazy(() => import('./views/Library'));
const DriveSource = lazy(() => import('./views/DriveSource'));
const LandingPage = lazy(() => import('./views/LandingPage'));
const Profile = lazy(() => import('./views/Profile'));
const AdminPanel = lazy(() => import('./views/AdminPanel'));
const Artists = lazy(() => import('./views/Artists'));
const PrivacyPolicy = lazy(() => import('./views/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./views/TermsOfService'));
const AboutUs = lazy(() => import('./views/AboutUs'));
const ContactUs = lazy(() => import('./views/ContactUs'));

const PageLoader = () => (
  <div className="h-[60vh] w-full flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg shadow-primary/20" />
  </div>
);

const RootLayout = () => {
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        path: "app",
        element: (
          <ProtectedRoute>
            <GDriveProvider>
              <PlaylistProvider>
                <PlayerProvider>
                  <>
                    <Layout />
                    <MusicPlayer />
                  </>
                </PlayerProvider>
              </PlaylistProvider>
            </GDriveProvider>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            ),
          },
          {
            path: "search",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Search />
              </Suspense>
            ),
          },
          {
            path: "library",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Library />
              </Suspense>
            ),
          },
          {
            path: "drive",
            element: (
              <Suspense fallback={<PageLoader />}>
                <DriveSource />
              </Suspense>
            ),
          },
          {
            path: "artists",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Artists />
              </Suspense>
            ),
          },
          {
            path: "profile",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            ),
          },
          {
            path: "admin-panel",
            element: (
              <AdminRoute>
                <Suspense fallback={<PageLoader />}>
                  <AdminPanel />
                </Suspense>
              </AdminRoute>
            ),
          },
        ],
      },
      {
        path: "privacy-policy",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PrivacyPolicy />
          </Suspense>
        ),
      },
      {
        path: "terms-of-service",
        element: (
          <Suspense fallback={<PageLoader />}>
            <TermsOfService />
          </Suspense>
        ),
      },
      {
        path: "about-us",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AboutUs />
          </Suspense>
        ),
      },
      {
        path: "contact-us",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ContactUs />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

import { ToastProvider } from './context/ToastContext';
import { GDriveProvider } from './context/GDriveContext';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
