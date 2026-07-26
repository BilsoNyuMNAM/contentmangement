import { NotionRenderer } from 'react-notion-x'; 

import { useEffect, useState } from 'react'; 
import { getNotes } from '../../service/centralisedApi';
import 'react-notion-x/src/styles.css'; 
import './Noteui.css';
import Dropdown from '../Components/Dropdown';
import { useParams } from 'react-router';
import { Code } from 'react-notion-x/build/third-party/code';
import 'prismjs/themes/prism-tomorrow.css';

export default function Noteui(){
    // const location = useLocation();
    // const subject_id = location.state?.subject_id;
    // //subject_id type: number 
    const {subject_name} = useParams();
    // console.log("subject_name", subject_name)
    const [recordMap, setrecordmap] = useState(null);
    const [chaptersData, setChaptersData] = useState(null);
    useEffect(()=>{
        // console.log("inside the useEffect")
        getNotescontent();
    },[])
    if(!recordMap){
        return(
            <div className="noteui-loading">
                <div className="noteui-loading-spinner"></div>
                <span>Loading documentation…</span>
            </div>
        )
    }
    async function getNotescontent(){
        const notes = await getNotes(subject_name);
        setrecordmap(notes.recordMap);
        setChaptersData(notes.chaptersData);
    }
    
    return(
        <div className="noteui-wrapper">
            <div className='w-full text-white p-6 fixed z-10'>
                <div >
                    <Dropdown chaptersData={chaptersData} subject_name={subject_name}/>
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