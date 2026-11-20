import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import './App.css';
import { AppRouter } from './Router';
import type { AppDispatch } from './app/store';
import { logout } from './app/store/authSlice';
import { watchSessionDay } from './utils/dailySession';

export const App = () =>  {
  const dispatch = useDispatch<AppDispatch>();

  // A session lasts one day: a tab that is brought back to the front on a later
  // day signs out and shows the login page (utils/dailySession).
  useEffect(() => watchSessionDay(() => dispatch(logout())), [dispatch]);

  return (
    <AppRouter/>
  )
}
