import Box from '@mui/material/Box';
import { Props } from './types';
import { Sidebar } from '../Sidebar';
import { Header } from '../Header';

export const Layout = ({ children }: Props) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <Box sx={{ marginLeft: '250px', flex: 1, paddingTop: '100px' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
