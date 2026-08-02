import { useNavigate } from "react-router"
import { getNotes } from "@/service/centralisedApi";
import { useQueryClient } from "@tanstack/react-query";
export default function CourseCard({subject_name, description}:{subject_name:string, description:string}){
    const navigate  = useNavigate();
    const queryClient = useQueryClient();

    const prefetchNotes = async (subject_name: string) =>{
        //1.Fetch & cache for ['notes', undefined] (returns data)
        const data = await queryClient.fetchQuery({
            queryKey:['notes', undefined],
            queryFn:()=>{return getNotes(subject_name)}, // the cached data comes from here  which is stored in the queryClient 
            staleTime: 1000 * 60 * 5,
        })
        //2. Extract first chapter & format spaces with hyphens
        const firstChapter = data?.chaptersData?.[0]?.chapterName?.replaceAll(" ", "-");
        // 3. Seed cache for ['notes', firstChapter]
        if (firstChapter) {
            queryClient.setQueryData(['notes', firstChapter], data);
        }
        
    }
    
    
    return(
        <div>
            <div className="px-6 py-6 rounded-lg border mb-4 border-neutral-300 dark:border-[#9ca3af] ">
                <div className="flex flex-row gap-6 items-center justify-between">
                    <div className="flex flex-row gap-2 gap-2 flex-1">
                        <div className="h-8 w-2 border-2 bg-neutral-400 dark:bg-[#9ca3af]"></div>
                        <div>
                            <div>
                                <h1 className="font-extrabold text-2xl text-black dark:text-white font-spaceMono">{subject_name}</h1>
                            </div>
                            <div className="text-neutral-500 dark:text-[#9ca3af]">
                                <p>{description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-black dark:text-white flex border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-2">
                        <button className="font-spaceMono" onMouseOver={() => {prefetchNotes(subject_name)}} onClick={() => navigate(`/${subject_name.replaceAll(" ", "-")}`)}>Start <span>→</span></button>
                    </div>
                </div>
            </div>
        </div>
    )
}