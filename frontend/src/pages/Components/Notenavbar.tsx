

import { useParams, useNavigate } from "react-router"
import { useState } from "react";
export default function Notenavbar({chapterList, subjectName}:{chapterList:any, subjectName:string}){
    //chapterList: [{}, {}, {}]
    const { chapter_name } = useParams();
    const [currentChapterIndex, setCurrentChapterIndex] = useState(chapterList.findIndex(chapter=>chapter.chapterName.replaceAll(" ", "-") === chapter_name));
    const Navigate = useNavigate();

    function handleNext(){
        const nextIndex = currentChapterIndex + 1;
        if (nextIndex >= chapterList.length) return;
        setCurrentChapterIndex(nextIndex);
        Navigate(`/${subjectName}/${chapterList[nextIndex].chapterName.replaceAll(" ", "-")}`, { replace: true });
    }

    function handlePrevious(){
        const prevIndex = currentChapterIndex - 1;
        if (prevIndex < 0) return;
        setCurrentChapterIndex(prevIndex);
        Navigate(`/${subjectName}/${chapterList[prevIndex].chapterName.replaceAll(" ", "-")}`, { replace: true });
    }

    return(
        <div className="flex text-black dark:text-white position-fixed w-full justify-between p-4">
            <div>
                <button disabled={currentChapterIndex <= 0} onClick={handlePrevious} className="disabled:text-gray-500">Previous</button>
            </div>
            <div>
                <button disabled={currentChapterIndex >= chapterList.length - 1} onClick={handleNext} className="disabled:text-gray-500">Next</button>
            </div>
        </div>
    )
}