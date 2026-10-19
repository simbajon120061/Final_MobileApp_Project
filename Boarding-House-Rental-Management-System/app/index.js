import React, { useEffect, useState } from 'react';
import { BackHandler, Linking, Platform } from 'react-native';
import { ThemeProvider } from './utils/ThemeContext';
import OpeningScreen from './components/OpeningScreen';
import LoginScreen from './screens/auth/LoginScreen';
import LandlordApp from './LandlordApp';
import TenantApp from './TenantApp';
import { handleAuthRedirect, logout, subscribeToCurrentUser } from './services/authService';
import PasswordRecoveryScreen from './screens/auth/PasswordRecoveryScreen';

function AppRouter() {
  const [currentUser, setCurrentUser] = useState(null); // null = unauthenticated
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth = null;

    const handleRecoveryLink = async (url) => {
      try {
        const isRecoveryLink = await handleAuthRedirect(url);
        if (isMounted && isRecoveryLink) setPasswordRecovery(true);
      } catch (error) {
        console.warn('Supabase auth link could not be processed:', error.message);
      }
    };

    let linkSubscription = null;
    if (Platform.OS !== 'web') {
      Linking.getInitialURL().then((url) => {
        if (url) return handleRecoveryLink(url);
        return undefined;
      });
      linkSubscription = Linking.addEventListener('url', ({ url }) => handleRecoveryLink(url));
    }

    subscribeToCurrentUser((user) => {
      if (!isMounted) return;
      setCurrentUser(user);
      setCheckingAuth(false);
    }, () => {
      if (!isMounted) return;
      setCheckingAuth(false);
    }, () => {
      if (!isMounted) return;
      setPasswordRecovery(true);
    }).then((unsubscribe) => {
      if (!isMounted) {
        unsubscribe();
        return;
      }

      unsubscribeAuth = unsubscribe;
    }).catch((error) => {
      console.warn('Supabase auth listener failed:', error.message);
      if (isMounted) setCheckingAuth(false);
    });

    return () => {
      isMounted = false;
      linkSubscription?.remove();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || (!checkingAuth && !currentUser)) return undefined;

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });

    return () => backSubscription.remove();
  }, [checkingAuth, currentUser]);

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  if (checkingAuth) return <OpeningScreen />;

  if (passwordRecovery) {
    return <PasswordRecoveryScreen onComplete={(user) => {
      setPasswordRecovery(false);
      setCurrentUser(user);
    }} />;
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  // Landlord role consolidates owner and caretaker
  if (currentUser.role === 'landlord') {
    return <LandlordApp user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'tenant') {
    return <TenantApp user={currentUser} onLogout={handleLogout} />;
  }

  return <LoginScreen onLoginSuccess={setCurrentUser} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}
