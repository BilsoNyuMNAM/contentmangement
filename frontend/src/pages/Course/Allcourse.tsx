import CourseCard from "../Components/CourseCard";
import Coursehero from "../Components/Coursehero";
import CourseFilter from "../Components/CourseFilter";
import { getAllCourses } from "../../service/centralisedApi";
import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
    const searchCourse = useRef<HTMLInputElement>(null);
    
    const themeContext = useContext(theme);
    const currentTheme = themeContext?.currentTheme;
    const setTheme = themeContext?.setTheme;

    const { data, isLoading, isError } = useQuery({
        queryKey: ["courses"],
        queryFn: getAllCourses
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
                <div className="w-full max-w-5xl px-6 mt-10 py-8">
                    <div className="animate-pulse mb-10">
                        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-3"></div>
                        <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                    </div>

                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-800 animate-pulse h-48 bg-neutral-100 dark:bg-neutral-900"
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
            <div className="h-screen bg-white dark:bg-black text-black dark:text-white flex justify-center items-center">
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
            <div className="w-full max-w-5xl px-6 mt-6 py-8"> 
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                    <Coursehero />
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <input 
                            type="text" 
                            ref={searchCourse} 
                            onInput={searchFunction} 
                            placeholder="Search courses..." 
                            className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 flex-1 md:w-64" 
                        />
                        <CourseFilter tags={tags} selectedTag={selectedTag} onSelectTag={handleTagSelect} />
                        <button
                            onClick={setTheme}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-sm font-medium cursor-pointer"
                            aria-label="Toggle theme"
                        >
                            {currentTheme === 'dark' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                    Light
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                    Dark
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
        </div>
    );
}