import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router"
import { BookOpen, ChevronDown } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { getNotes } from "@/service/centralisedApi"
import { useState } from "react"
import { useEffect } from "react"
export default function Dropdown({ chaptersData, subject_name, chapter_name }: { chaptersData: any[] | null , subject_name:string, chapter_name:string | undefined}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // const [currentChapter, setCurrentChapter] = useState(chaptersData.find(chapter=>chapter.chapterName.replaceAll("-", " ") === chapter_name)?.chapterName || "");
    const [currentChapter, setCurrentChapter] = useState(chaptersData?.find(chapter=>chapter.chapterName.replaceAll("-", " ") === chapter_name)?.chapterName || "");
    const prefetchChapter = (chapterName: string) => {
        const formattedChapter = chapterName.replaceAll(" ", "-");
        queryClient.prefetchQuery({
            queryKey: ['notes', formattedChapter],
            queryFn: () => getNotes(subject_name, formattedChapter),
            staleTime: 1000 * 60 * 5,
        });
    };
    useEffect(() => {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const target = norm(chapter_name || "");
        const current = chaptersData?.find(chapter => norm(chapter.chapterName) === target)?.chapterName || "";
        setCurrentChapter(current)
    },[chapter_name, chaptersData])

    
    console.log("currentChapter:", currentChapter)
    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger render={
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium tracking-wide text-neutral-200 bg-neutral-900/90 border border-neutral-800 rounded-lg hover:bg-neutral-800 hover:text-white hover:border-neutral-700 transition-all duration-200 shadow-sm cursor-pointer"
                    />
                }>
                    <BookOpen className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="font-spaceMono">Chapters</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-neutral-950/95 border border-neutral-800/80 backdrop-blur-xl p-1.5 rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
                    <DropdownMenuGroup>
                        {chaptersData && chaptersData.map((chapter) => (
                            <DropdownMenuItem 
                                key={chapter.id} 
                                onMouseOver={() => prefetchChapter(chapter.chapterName)}
                                onClick={() => {navigate(`/${subject_name}/${chapter.chapterName.replaceAll(" ", "-")}`); setCurrentChapter(chapter.chapterName)}}
                                className={`flex items-center gap-2 text-xs font-spaceMono px-3 py-2 rounded-lg   text-white focus:bg-neutral-800 transition-colors duration-150 cursor-pointer ${chapter.chapterName.replaceAll(" ", "-").toLowerCase() === chapter_name?.toLowerCase()? "text-neutral-500" : ""}`}                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-indigo-400 transition-colors" />
                                {chapter.chapterName}
                                
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}