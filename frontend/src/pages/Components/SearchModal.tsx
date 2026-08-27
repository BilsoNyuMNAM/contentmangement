import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Search, X, BookOpen, FileText, ArrowRight, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { searchContent } from "../../service/centralisedApi";

interface SearchCourseResult {
    id: number;
    title: string;
    description: string | null;
    tag?: string;
    chaptersCount?: number;
    status?: string;
}

interface SearchChapterResult {
    id: number;
    chapterName: string;
    courseId: number;
    courseTitle: string;
    tag?: string;
    order: number | null;
    pageId: string;
    snippet: string;
    status?: string;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [courses, setCourses] = useState<SearchCourseResult[]>([]);
    const [chapters, setChapters] = useState<SearchChapterResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        } else {
            setQuery("");
            setCourses([]);
            setChapters([]);
        }
    }, [isOpen]);

    // Handle Debounced Search
    useEffect(() => {
        if (!query.trim()) {
            setCourses([]);
            setChapters([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await searchContent(query.trim());
                setCourses(res.courses || []);
                setChapters(res.chapters || []);
                setSelectedIndex(0);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard shortcuts: ESC to close, Up/Down arrow to navigate, Enter to select
    const allResults = [
        ...courses.map(c => ({ type: 'course' as const, data: c })),
        ...chapters.map(ch => ({ type: 'chapter' as const, data: ch }))
    ];

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape") {
            onClose();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (allResults.length > 0) {
                setSelectedIndex(prev => (prev + 1) % allResults.length);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (allResults.length > 0) {
                setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (allResults[selectedIndex]) {
                const item = allResults[selectedIndex];
                if (item.type === 'course') {
                    handleSelectCourse(item.data.title);
                } else {
                    handleSelectChapter(item.data.courseTitle, item.data.chapterName);
                }
            }
        }
    }

    function handleSelectCourse(title: string) {
        onClose();
        navigate(`/${title.replaceAll(" ", "-")}`);
    }

    function handleSelectChapter(courseTitle: string, chapterName: string) {
        onClose();
        navigate(`/${courseTitle.replaceAll(" ", "-")}/${chapterName.replaceAll(" ", "-")}`);
    }

    function highlightMatch(text: string, highlight: string) {
        if (!highlight.trim() || !text) return text;
        const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} className="bg-amber-200 dark:bg-amber-900/70 text-neutral-900 dark:text-amber-100 rounded-xs px-0.5 font-semibold">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    }

    if (!isOpen) return null;

    let flatIndexCounter = 0;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-2xl bg-white dark:bg-[#121212] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-neutral-900 dark:text-neutral-100 font-sans animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Search Input Bar */}
                <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 gap-3">
                    <Search className="w-5 h-5 text-neutral-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search courses, chapters, and full documentation..."
                        className="flex-1 bg-transparent text-sm sm:text-base focus:outline-none placeholder-neutral-400 text-neutral-900 dark:text-neutral-100 min-w-0"
                    />
                    {loading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin shrink-0" />}
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 font-mono hidden sm:inline"
                    >
                        ESC
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {!query.trim() && (
                        <div className="py-12 px-6 text-center text-neutral-400">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                                Full-Text Search
                            </p>
                            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                                Type any keyword to instantly search inside course titles and chapter contents across your entire CMS.
                            </p>
                        </div>
                    )}

                    {query.trim() && !loading && courses.length === 0 && chapters.length === 0 && (
                        <div className="py-12 px-6 text-center text-neutral-400">
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                No matching courses or chapters found
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                                Try searching for another topic, keyword, or chapter title.
                            </p>
                        </div>
                    )}

                    {/* Courses Section */}
                    {courses.length > 0 && (
                        <div className="py-2">
                            <div className="px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                Courses ({courses.length})
                            </div>
                            <div className="space-y-1 mt-1">
                                {courses.map((course) => {
                                    const currentIndex = flatIndexCounter++;
                                    const isSelected = selectedIndex === currentIndex;
                                    return (
                                        <div
                                            key={`course-${course.id}`}
                                            onClick={() => handleSelectCourse(course.title)}
                                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                                            className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                                                isSelected 
                                                    ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-white' 
                                                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm truncate">
                                                        {highlightMatch(course.title, query)}
                                                    </span>
                                                    {course.tag && (
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                                            #{course.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                {course.description && (
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                                        {highlightMatch(course.description, query)}
                                                    </p>
                                                )}
                                            </div>
                                            <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${isSelected ? 'opacity-100 text-indigo-500' : 'opacity-0'}`} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Chapter Content Matches Section */}
                    {chapters.length > 0 && (
                        <div className="py-2">
                            <div className="px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                Chapter Content ({chapters.length})
                            </div>
                            <div className="space-y-1 mt-1">
                                {chapters.map((chapter) => {
                                    const currentIndex = flatIndexCounter++;
                                    const isSelected = selectedIndex === currentIndex;
                                    return (
                                        <div
                                            key={`ch-${chapter.id}`}
                                            onClick={() => handleSelectChapter(chapter.courseTitle, chapter.chapterName)}
                                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                                            className={`px-3 py-2.5 rounded-lg cursor-pointer flex flex-col gap-1 transition-colors ${
                                                isSelected 
                                                    ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-white' 
                                                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                                        {highlightMatch(chapter.chapterName, query)}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 shrink-0">
                                                        in <span className="font-medium text-neutral-600 dark:text-neutral-300">{chapter.courseTitle}</span>
                                                    </span>
                                                </div>
                                                {chapter.tag && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
                                                        #{chapter.tag}
                                                    </span>
                                                )}
                                            </div>
                                            {chapter.snippet && (
                                                <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed bg-neutral-50 dark:bg-neutral-950/60 p-1.5 rounded border border-neutral-100 dark:border-neutral-800/60">
                                                    {highlightMatch(chapter.snippet, query)}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="px-4 py-2 bg-neutral-50 dark:bg-[#0c0c0c] border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono text-[10px]">↑</kbd>
                            <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono text-[10px]">↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono text-[10px]">
                                <CornerDownLeft className="w-2.5 h-2.5 inline" />
                            </kbd>
                            Open
                        </span>
                    </div>
                    <span>{allResults.length} {allResults.length === 1 ? 'match' : 'matches'}</span>
                </div>
            </div>
        </div>
    );
}
