import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Avatar from '@mui/material/Avatar';
import Typography  from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
    const navigate = useNavigate();
    const [branches, setBranches] = React.useState('');
    const handleChange = (event: SelectChangeEvent) => {
        setBranches(event.target.value as string);
    };

  return (
    <Box component="section" sx={{
        width: '85%',
        height:'100px',
        borderBottom:'1px solid #ccc',
        ml:"250px",
        pr:"50px",
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        position:'fixed',
        top:0,
        left:0,
        zIndex:100,
        backgroundColor: "#fff",
    }}>
      <FormControl fullWidth sx={{width:"15%"}}>
        <InputLabel id="demo-simple-select-label">Branches</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={branches}
          label="Branches"
          onChange={handleChange}
        >
          <MenuItem value={10}>IELTS Campus</MenuItem>
          <MenuItem value={20}>Yangi Uzbekistan</MenuItem>
          <MenuItem value={30}>Istiqlol branch</MenuItem>
        </Select>
      </FormControl>

      <button onClick={() => navigate('/profile')} style={{display:'flex', border:'none', background:'none', cursor:'pointer'}}>
        <Box sx={{
            display:"flex",
            flexDirection:"column",
            alignItems:"end",
            columnGap:1,
            marginRight:2
            
        }} > 
            <Typography variant="h6">Odilbek Safarov</Typography>
            <Typography sx={{color:'dimgray'}} >Admin</Typography>
        </Box>
        <Avatar sx={{width:50, height:50}}>O</Avatar>
      </button>
    </Box>
  )
}


