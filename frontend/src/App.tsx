
import './App.css'
import {QueryClientProvider, QueryClient} from '@tanstack/react-query'
import Allcourse from './pages/Course/Allcourse'
import {BrowserRouter, Routes, Route} from 'react-router'
import Noteui from './pages/note/Noteui'
import Pagenotfound from './pages/Components/Pagenotfound'
import AdminPage from './pages/Admin/AdminPage'
const queryClient = new QueryClient();
function App() {

  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Allcourse/>}/>
        <Route path="/admin" element={<AdminPage />}/>
        <Route path="/:subject_name" element={<Noteui/>}/>
        <Route path="/:subject_name/:chapter_name" element={<Noteui/>}/>
        <Route path="/notfound" element={<Pagenotfound/>}/>
        <Route path="*" element={<Pagenotfound/>}/>
      </Routes>
      
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
