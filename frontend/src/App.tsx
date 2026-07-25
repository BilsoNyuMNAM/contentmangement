
import './App.css'
import Allcourse from './pages/Course/Allcourse'
import {BrowserRouter, Routes, Route} from 'react-router'
import Noteui from './pages/Course/Noteui'


function App() {
  

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Allcourse/>}/>
        <Route path="/:subject_name" element={<Noteui/>}/>
      </Routes>
      
    </BrowserRouter>
  )
}

export default App
