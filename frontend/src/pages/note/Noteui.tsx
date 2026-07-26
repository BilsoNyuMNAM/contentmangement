import { NotionRenderer } from 'react-notion-x'; 
import { useEffect, useState } from 'react'; 
import { getNotes } from '../../service/centralisedApi';
import 'react-notion-x/src/styles.css'; 
import './Noteui.css';


import { Code } from 'react-notion-x/build/third-party/code';
import 'prismjs/themes/prism-tomorrow.css';

export default function Noteui(){
    const [recordMap, setrecordmap] = useState(null);
    useEffect(()=>{
        console.log("inside the useEffect")
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
        const notes = await getNotes();
        setrecordmap(notes.recordMap);
    }
    
    return(
        <div className="noteui-wrapper">
            <NotionRenderer 
                recordMap={recordMap} fullPage={true} darkMode={true} disableHeader={true}
                components={{
                    Code
                }}
            />
        </div>
    )
}