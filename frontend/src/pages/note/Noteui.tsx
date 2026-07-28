import { NotionRenderer } from 'react-notion-x'; 
import Backtohome from '../Components/Backtohome';
import { getNotes } from '../../service/centralisedApi';
import 'react-notion-x/src/styles.css'; 
import './Noteui.css';
import Dropdown from '../Components/Dropdown';
import { useParams, useNavigate } from 'react-router';
import { Code } from 'react-notion-x/build/third-party/code';
import 'prismjs/themes/prism-tomorrow.css';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export default function Noteui(){
    // const location = useLocation();
    // const subject_id = location.state?.subject_id;
    // //subject_id type: number 
    const navigate = useNavigate();
    const {subject_name, chapter_name} = useParams();
    async function getNotescontent(){
        const notes = await getNotes(subject_name, chapter_name);
        
        if (!chapter_name && notes.chaptersData && notes.chaptersData.length > 0) {
            navigate(`/${subject_name}/${notes.chaptersData[0].chapterName.replaceAll(" ", "-")}`, { replace: true });
        }
        
        return notes;
    }
    const {data, isError,isLoading} = useQuery({
        queryKey:['notes', subject_name, chapter_name],
        queryFn:getNotescontent
    })

    useEffect(() => {
        if (isError) {
            navigate("/notfound", { replace: true });
        }
    }, [isError, navigate]);

    if(isLoading){
        return(
            <div className="noteui-loading">
                <div className="noteui-loading-spinner"></div>
                <span>Loading documentation…</span>
            </div>
        )
    }

    if (isError) {
        return null;
    }




    return(
        <div className="noteui-wrapper">
            <div className='w-full text-white p-6 fixed z-10 flex gap-3 items-center'>
                <div >
                    <Dropdown chaptersData={data?.chaptersData} subject_name={subject_name} chapter_name={chapter_name}/>
                </div>  
                <div className='text-white text-4xl tracking-tighter font-semibold'>
                    <h2>{subject_name}</h2>
                </div>
                <div>
                    <Backtohome/>
                </div>
            </div>
            <NotionRenderer 
                recordMap={data?.recordMap} fullPage={true} darkMode={true} disableHeader={true}
                components={{
                    Code
                }}
            />
        </div>
    )
}