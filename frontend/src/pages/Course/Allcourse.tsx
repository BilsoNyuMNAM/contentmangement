import CourseCard from "../Components/CourseCard";
import Coursehero from "../Components/Coursehero";
import CourseFilter from "../Components/CourseFilter";
import SearchModal from "../Components/SearchModal";
import { getAllCourses } from "../../service/centralisedApi";
import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, BookOpen, Search } from "lucide-react";
import { theme } from "../../theme";
import Fuse from "fuse.js";

interface Course {
    id: number;
    title: string;
    description?: string;
    tagId?: number;
    tag: string;
    _count?: {
        chapters: number;
    };
}

interface Tag {
    id: number;
    tagName: string;
    courses: {
        id: number;
        title: string;
        description?: string;
        tagId?: number;
        _count?: {
            chapters: number;
        };
    }[];
}

export default function Allcourse() {
    const navigate = useNavigate();
    const searchCourse = useRef<HTMLInputElement>(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    const themeContext = useContext(theme);
    const currentTheme = themeContext?.currentTheme;
    const setTheme = themeContext?.setTheme;

    // Listen for Cmd+K / Ctrl+K
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsSearchModalOpen((prev) => !prev);
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["courses"],
        queryFn: getAllCourses,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const [searchResults, setSearchResults] = useState<Course[] | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const courses = useMemo<Course[]>(() => {
        if (!data?.data) return [];
        return data.data.flatMap((tag: Tag) =>
            tag.courses.map((course) => ({
                ...course,
                tag: tag.tagName,
            }))
        );
    }, [data]);

    const tags = useMemo<string[]>(() => {
        if (!data?.data) return [];
        return data.data.map((tag: Tag) => tag.tagName);
    }, [data]);

    useEffect(() => {
        if (courses.length > 0) {
            setSearchResults(courses);
        }
    }, [courses]);

    if (isLoading) {
        return (
            <div className="w-full min-h-screen flex justify-center bg-white dark:bg-black">
                <div className="w-full max-w-5xl px-4 sm:px-6 mt-10 py-8">
                    <div className="animate-pulse mb-10">
                        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-3"></div>
                        <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                    </div>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="p-4 sm:p-6 rounded-lg border border-neutral-200 dark:border-neutral-800 animate-pulse h-48 bg-neutral-100 dark:bg-neutral-900"
                            >
                                <div className="h-4 w-20 bg-neutral-300 dark:bg-neutral-700 rounded-full mb-4"></div>
                                <div className="h-6 w-3/4 bg-neutral-300 dark:bg-neutral-700 rounded-md mb-2"></div>
                                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md mb-2"></div>
                                <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="h-screen bg-white dark:bg-black text-black dark:text-white flex justify-center items-center px-4 text-center">
                Failed to load courses. Please try again later.
            </div>
        );
    }

    const options = {
        keys: ['title', 'description'],
        threshold: 0.3,
    };
    const fuse = new Fuse(courses, options);

    function searchFunction() {
        const query = searchCourse.current?.value;

        if (selectedTag) {
            setSelectedTag(null);
        }
        if (!query) {
            setSearchResults(courses);
            return;
        }
        const result = fuse.search(query);
        setSearchResults(result.map((res) => res.item));
    }

    function handleTagSelect(tag: string | null) {
        setSelectedTag(tag);
        if (searchCourse.current) {
            searchCourse.current.value = "";
        }
        setSearchResults(null);
    }

    const displayCourses = selectedTag
        ? courses.filter((course) => course.tag === selectedTag)
        : (searchResults ?? courses);

    return (
        <div className="w-full min-h-screen flex justify-center bg-white dark:bg-black text-black dark:text-white font-sans antialiased">
            <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
            <div className="w-full max-w-5xl px-4 sm:px-6 mt-4 sm:mt-6 py-6 sm:py-8">
                <div className="w-full flex flex-col gap-4 mb-6 sm:mb-8">
                    <Coursehero />
                    <div className="flex items-center gap-2 sm:gap-3 w-full">
                        <div className="relative flex-1 min-w-0">
                            <input
                                type="text"
                                ref={searchCourse}
                                onInput={searchFunction}
                                placeholder="Search courses..."
                                className="w-full p-2 pr-20 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                            />
                            <button
                                type="button"
                                onClick={() => setIsSearchModalOpen(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 transition-colors cursor-pointer"
                                title="Full-Text Documentation Search"
                            >
                                <Search className="w-3 h-3 inline" />
                                <span>⌘K</span>
                            </button>
                        </div>
                        <CourseFilter tags={tags} selectedTag={selectedTag} onSelectTag={handleTagSelect} />
                        <button
                            onClick={() => navigate("/admin")}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-sm font-medium cursor-pointer shrink-0"
                            title="Admin Panel - Add Course"
                        >
                            <Plus className="w-4 h-4 text-indigo-500" />
                            <span className="hidden sm:inline">Add Course</span>
                        </button>
                        <button
                            onClick={setTheme}
                            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-sm font-medium cursor-pointer shrink-0"
                            aria-label="Toggle theme"
                        >
                            {currentTheme === 'dark' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                                    <span className="hidden sm:inline">Light</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                    <span className="hidden sm:inline">Dark</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {displayCourses.length === 0 ? (
                    <div className="mt-8 flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-center max-w-lg mx-auto">
                        <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-500">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">No courses found</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
                            {selectedTag || searchCourse.current?.value
                                ? "No courses match your current search or filter."
                                : "There are no courses yet. Import your first course and its chapters from Notion in seconds."}
                        </p>
                        <button
                            onClick={() => navigate("/admin")}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Add Your First Course
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {displayCourses.map((course: Course, index: number) => (
                            <CourseCard
                                key={course.id || index}
                                subject_name={course.title}
                                description={course.description || ""}
                                tag={course.tag}
                                chaptersCount={course._count?.chapters}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}