import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { slugify, normalizeSlug } from "@/lib/slug";

export default function Notenavbar({ chapterList, subjectName }: { chapterList: any[], subjectName: string }) {
    const { chapter_name } = useParams();

    const getIndex = () => {
        if (!chapterList || !chapter_name) return 0;
        const target = normalizeSlug(chapter_name);
        return chapterList.findIndex(
            (chapter) => normalizeSlug(chapter.chapterName) === target
        );
    };

    const [currentChapterIndex, setCurrentChapterIndex] = useState(getIndex());

    useEffect(() => {
        const idx = getIndex();
        if (idx !== -1) {
            setCurrentChapterIndex(idx);
        }
    }, [chapter_name, chapterList]);

    const navigate = useNavigate();

    function handleNext() {
        const nextIndex = currentChapterIndex + 1;
        if (nextIndex >= chapterList.length) return;
        setCurrentChapterIndex(nextIndex);
        navigate(`/${slugify(subjectName)}/${slugify(chapterList[nextIndex].chapterName)}`, { replace: true });
    }

    function handlePrevious() {
        const prevIndex = currentChapterIndex - 1;
        if (prevIndex < 0) return;
        setCurrentChapterIndex(prevIndex);
        navigate(`/${slugify(subjectName)}/${slugify(chapterList[prevIndex].chapterName)}`, { replace: true });
    }

    const prevChapter = currentChapterIndex > 0 ? chapterList[currentChapterIndex - 1] : null;
    const nextChapter = currentChapterIndex < chapterList.length - 1 ? chapterList[currentChapterIndex + 1] : null;

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-8 mt-12 mb-8 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-spaceMono">
            {/* Previous Button */}
            <button
                disabled={currentChapterIndex <= 0}
                onClick={handlePrevious}
                className="w-full sm:w-auto group flex items-center gap-3 px-5 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:text-black dark:group-hover:text-white group-hover:-translate-x-1 transition-all duration-200" />
                <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Previous</div>
                    {prevChapter && (
                        <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white truncate max-w-[160px]">
                            {prevChapter.chapterName}
                        </div>
                    )}
                </div>
            </button>

            {/* Step Counter */}
            {chapterList && chapterList.length > 0 && (
                <div className="text-xs text-neutral-400 font-medium tracking-widest uppercase">
                    {currentChapterIndex + 1} / {chapterList.length}
                </div>
            )}

            {/* Next Button */}
            <button
                disabled={currentChapterIndex >= chapterList.length - 1}
                onClick={handleNext}
                className="w-full sm:w-auto group flex items-center justify-end gap-3 px-5 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Next</div>
                    {nextChapter && (
                        <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white truncate max-w-[160px]">
                            {nextChapter.chapterName}
                        </div>
                    )}
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
            </button>
        </div>
    );
}