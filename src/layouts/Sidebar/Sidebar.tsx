import { useState,  } from 'react';
import {Divider, Box, Button , Accordion, AccordionSummary, AccordionDetails} from '@mui/material';
import { Link , useLocation} from 'react-router-dom';
import { SETTINGS_LINKS, SIDE_BAR } from '../../constants';
// images
import logo from "../../assets/logo.svg";
import { IoNotifications } from "react-icons/io5";
import { FaAngleDown } from "react-icons/fa6";
import { IoMdSettings } from "react-icons/io";

export const Sidebar = () => {

  const { pathname } = useLocation();
  const [ settingsOpen, setSettingsOpen ] = useState(false);

  return (
    <Box sx={{
        width:240,
        height:'100vh',
        position:'fixed',
        top:0,
        left:0,
        bgcolor:'',
        overflowY:'auto',
        zIndex:12,
        borderRight:'2px solid #ccc'

    }}>
      <Box sx={{display:'flex',justifyContent:'center', flexDirection:"column", alignItems:'center', borderBottom:'1px solid #ccc'}}>
        <Link className='my-6' to={'/'}>
          <img src={logo} width={150} height={100} alt="" />
        </Link>
      </Box>

      <Box sx={{marginTop:4}}>
        {
          SIDE_BAR?.map((item, index) => {
            const isActive = pathname === item.path;
            return (
              <Link  
              onClick={() => setSettingsOpen(false)}
              key={index} 
              to={item.path}
              className='w-full block '

              >
             <Button sx={{
                borderRadius: 0,
                display: 'flex',
                justifyContent: "start",
                paddingY: 1.5,
                paddingLeft: 7,
                textTransform: 'none',
                color: isActive ? '#003366' : 'dimgray',
                bgcolor: 'transparent', // Foni shaffof
                borderLeft: isActive ? '4px solid #003366' : '4px solid transparent', // Chap tomonda chiziq
                fontWeight:"600",
                fontSize: 16,
                ":hover": {
                  color: "#003366",
                  bgcolor: "#f7fafc",
                }
              }}
                startIcon={item.icon}
                fullWidth
                color={pathname === item.path && !settingsOpen ? "primary" : "inherit" }
              >
                {item.label}
              </Button>
                <Box sx={{
                  width:5,
                  height:"100%",
                  position:'absolute',
                  left:0,
                  top:'30%',
                  transform:"translate(-50%)"
                }}
                >
                </Box>
              </Link>
            )
          })
        }
        
      </Box>

      <Divider sx={{my:2}} />

        
      <Box sx={{}}>
          <Link to={'/notifications'} className='w-full relative'>
            <Button sx={{borderRadius:0, display:'flex', justifyContent:'start', gap:"12px", paddingY:1.5, paddingLeft:4 , textTransform:'none', color:"dimgray"}}
            fullWidth
            startIcon={<IoNotifications size={18} color='dimgray' />  }
            variant='text'
            >
              Notification
            </Button>

            <Box sx={{
              width:5,
              height:"100%",
              position:"absolute",
              left:0,
              top:"50%",
              transform:"translateY(-50%)",
              borderRadius:4,

              bgcolor:
                pathname === "/notification" && settingsOpen
                ? "#003366" : "transparent"
            }}
              color={
                pathname === "/notification" && !settingsOpen
                ? "primary"
                : "inherit"
              }          
              >
              
            </Box>
          </Link>

          <Accordion
            onChange={(_, val) => setSettingsOpen(val)}
            expanded={settingsOpen}
            sx={{
              border:"none",
              marginTop:0,
              boxShadow:"none",
              padding:0,
              color:"#003366",
              pb:5
            }}
          >
              <AccordionSummary
                expandIcon={''}
                aria-controls="panel-content"
                id="panel-header"
                sx={{
                  padding:0, margin:0, maxHeight:"auto"
                }}

              >
               <Button sx={{
                marginLeft:"12px",
                borderRadius:0,
                justifyContent:"space-between",
                paddingY:1.5,
                paddingLeft:2,
                textTransform:"none"
               }}
               color={settingsOpen ? "primary" : "inherit"}
               fullWidth
               variant='text'
               className=''
               endIcon={
                <FaAngleDown
                size={15}
                className={`transition-all duration-200 ${
                  settingsOpen ? "-rotate-180" : ""}`}
                />
               }
               >
                <div className='flex items-center gap-x-3'>
                <IoMdSettings /> Settings
                </div>
               </Button>
              </AccordionSummary>
              <AccordionDetails sx={{padding:0, margin:0, pl:7, pt:1}}>
                 <Box sx={{
                  display:'flex',
                  flexDirection:"column",
                  alignItems:"flex-start",
                  gap:1
                 }}>

                  {
                    SETTINGS_LINKS.map((item) => {
                      return(
                        <Box sx={{
                          width:"80%",
                          p:0.7,
                          borderRadius:"4px",
                          bgcolor:pathname === item.path ? "#f7fafc" : "inherit",
                          color: pathname === item.path ? "#003366" : "inherit",
                          ":hover": { color:"#003366" }, 
                        }}>
                          <Link
                           className='w-full inline-block text-start'
                           key={item.path}
                           to={item.path}
                          >
                              {item.label}
                          </Link>
                        </Box>
                      )
                    })
                  }

                 </Box>
              </AccordionDetails>
          </Accordion>

      </Box>
    </Box>
  )
}

