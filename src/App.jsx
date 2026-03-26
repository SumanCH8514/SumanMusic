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
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { GDriveProvider } from './context/GDriveContext';


const Home = lazy(() => import('./views/Home'));
const Search = lazy(() => import('./views/Search'));
const Library = lazy(() => import('./views/Library'));
const OnlineLibrary = lazy(() => import('./views/OnlineLibrary'));
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

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RootLayout = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = "SumanMusic | Premium Music Streaming";
    
    if (path === "/") title = "SumanMusic | Premium Music Streaming from Google Drive";
    else if (path === "/app") title = "Home | SumanMusic";
    else if (path.startsWith("/app/search")) title = "Search | SumanMusic";
    else if (path.startsWith("/app/library")) title = "Library | SumanMusic";
    else if (path.startsWith("/app/online")) title = "Online Library | SumanMusic";
    else if (path.startsWith("/app/artists")) title = "Artists | SumanMusic";
    else if (path.startsWith("/app/profile")) title = "Profile | SumanMusic";
    else if (path === "/about-us") title = "About Us | SumanMusic";
    else if (path === "/contact-us") title = "Contact Us | SumanMusic";
    else if (path === "/privacy-policy") title = "Privacy Policy | SumanMusic";
    else if (path === "/terms-of-service") title = "Terms of Service | SumanMusic";

    document.title = title;
  }, [location]);

  return (
    <>
      <div id="youtube-player-container" className="hidden pointer-events-none invisible absolute -z-50" />
      <Outlet />
    </>
  );
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
            path: "online",
            element: (
              <Suspense fallback={<PageLoader />}>
                <OnlineLibrary />
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


function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <RouterProvider router={router} />
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
