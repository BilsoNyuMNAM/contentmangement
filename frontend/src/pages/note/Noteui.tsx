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
import { useEffect, useContext } from 'react';
import { theme } from '../../theme';
import Notenavbar from '../Components/Notenavbar';
export default function Noteui(){
    const navigate = useNavigate();
    const {subject_name, chapter_name} = useParams();
    const { currentTheme } = useContext(theme);
    const isDark = currentTheme === 'dark';
    
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
            <div className="noteui-loading dark:bg-black bg-white dark:text-neutral-400 text-neutral-600">
                <div className="noteui-loading-spinner"></div>
                <span>Loading documentation…</span>
            </div>
        )
    }

    if (isError) {
        return null;
    }




    return(
        <div className={`noteui-wrapper ${isDark ? '' : 'notion-light-mode'}`}>
            <div className='w-full text-black dark:text-white p-6 fixed z-10 flex gap-3 items-center bg-white/80 dark:bg-black/80 backdrop-blur-sm'>
                <div >
                    <Dropdown chaptersData={data?.chaptersData} subject_name={subject_name} chapter_name={chapter_name}/>
                </div>  
                <div className='text-black dark:text-white text-4xl tracking-tighter font-semibold'>
                    <h2>{subject_name}</h2>
                </div>
                <div>
                    <Backtohome/>
                </div>
            </div>
            <NotionRenderer 
                recordMap={data?.recordMap} fullPage={true} darkMode={isDark} disableHeader={true}
                components={{
                    Code
                }}
            />
            {
              data?.chaptersData?<Notenavbar chapterList={data.chaptersData} subjectName={subject_name}/> : null
            }
            
        </div>
    )
}