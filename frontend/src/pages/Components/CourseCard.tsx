import { useNavigate } from "react-router"
import { getNotes } from "@/service/centralisedApi";
import { useQueryClient } from "@tanstack/react-query";

export default function CourseCard({ subject_name, description, tag, chaptersCount }: { subject_name: string, description: string, tag?: string, chaptersCount?: number }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const prefetchNotes = async (name: string) => {
        const data = await queryClient.fetchQuery({
            queryKey: ['notes', undefined],
            queryFn: () => getNotes(name),
            staleTime: 1000 * 60 * 5,
        });
        const firstChapter = data?.chaptersData?.[0]?.chapterName?.replaceAll(" ", "-");
        if (firstChapter) {
            queryClient.setQueryData(['notes', firstChapter], data);
        }
    };

    const formattedTag = tag ? tag.toUpperCase() : "GENERAL";
    const count = chaptersCount !== undefined ? chaptersCount : 0;

    return (
        <div 
            className="block border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[200px] bg-white dark:bg-[#0e0e0e] hover:border-neutral-400 dark:hover:border-neutral-600 transition-all cursor-pointer shadow-xs dark:shadow-none"
            onMouseOver={() => prefetchNotes(subject_name)}
            onClick={() => navigate(`/${subject_name.replaceAll(" ", "-")}`)}
        >
            <button 
                className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    prefetchNotes(subject_name);
                    navigate(`/${subject_name.replaceAll(" ", "-")}`);
                }}
            >
                Start <span className="font-mono">→</span>
            </button>

            <div>
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full inline-block mb-3 tracking-wider text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    #{formattedTag}
                </span>
                <h2 className="font-semibold text-lg sm:text-xl text-neutral-900 dark:text-white mb-2 tracking-tight pr-16 sm:pr-20">
                    {subject_name}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {description}
                </p>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-0.5-5"/>
                    </svg>
                    {count} {count === 1 ? 'chapter' : 'chapters'}
                </span>
            </div>
        </div>
    );
}