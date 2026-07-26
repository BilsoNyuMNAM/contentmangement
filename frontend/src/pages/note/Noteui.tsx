import { NotionRenderer } from 'react-notion-x'; 

import { useEffect, useState } from 'react'; 
import { getNotes } from '../../service/centralisedApi';
import 'react-notion-x/src/styles.css'; 
import './Noteui.css';
import Dropdown from '../Components/Dropdown';
import { useParams, useNavigate } from 'react-router';
import { Code } from 'react-notion-x/build/third-party/code';
import 'prismjs/themes/prism-tomorrow.css';
import { Divide } from 'lucide-react';

export default function Noteui(){
    // const location = useLocation();
    // const subject_id = location.state?.subject_id;
    // //subject_id type: number 
    const {subject_name, chapter_name} = useParams();
    const navigate = useNavigate();
    // console.log("subject_name", subject_name)
    const [recordMap, setrecordmap] = useState(null);
    const [chaptersData, setChaptersData] = useState(null);
    useEffect(()=>{
        // console.log("inside the useEffect")
        getNotescontent();
    },[subject_name, chapter_name])

    if(!recordMap){
        return(
            <div className="noteui-loading">
                <div className="noteui-loading-spinner"></div>
                <span>Loading documentation…</span>
            </div>
        )
    }
    async function getNotescontent(){
        const notes = await getNotes(subject_name, chapter_name);
        setrecordmap(notes.recordMap);
        setChaptersData(notes.chaptersData);
        
        if (!chapter_name && notes.chaptersData && notes.chaptersData.length > 0) {
            navigate(`/${subject_name}/${notes.chaptersData[0].chapterName.replaceAll(" ", "-")}`, { replace: true });
        }
    }
    
    return(
        <div className="noteui-wrapper">
            <div className='w-full text-white p-6 fixed z-10 flex gap-3 items-center'>
                <div >
                    <Dropdown chaptersData={chaptersData} subject_name={subject_name}/>
                </div>  
                <div className='text-white text-4xl tracking-tighter font-semibold'>
                    <h2>{subject_name}</h2>
                </div>
            </div>
            <NotionRenderer 
                recordMap={recordMap} fullPage={true} darkMode={true} disableHeader={true}
                components={{
                    Code
                }}
            />
        </div>
    )
}