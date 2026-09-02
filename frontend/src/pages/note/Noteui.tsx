import { NotionRenderer } from 'react-notion-x'; 
import Backtohome from '../Components/Backtohome';
import { getNotes } from '../../service/centralisedApi';
import 'react-notion-x/src/styles.css'; 
import './Noteui.css';
import Dropdown from '../Components/Dropdown';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Code } from 'react-notion-x/build/third-party/code';
import 'prismjs/themes/prism-tomorrow.css';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useContext, useCallback } from 'react';
import { theme } from '../../theme';
import Notenavbar from '../Components/Notenavbar';
import NotionErrorBoundary from '../Components/NotionErrorBoundary';
import { slugify, extractNotionId, resolveNotionTarget } from '@/lib/slug';

export default function Noteui(){
    const navigate = useNavigate();
    const location = useLocation();
    const {subject_name, chapter_name} = useParams();
    const themeContext = useContext(theme);
    const currentTheme = themeContext?.currentTheme;
    const isDark = currentTheme === 'dark';
    
    async function getNotescontent(){
        const notes = await getNotes(subject_name || "", chapter_name);
        
        if (!chapter_name && notes.chaptersData && notes.chaptersData.length > 0) {
            navigate(`/${slugify(subject_name || "")}/${slugify(notes.chaptersData[0].chapterName)}`, { replace: true });
        }
        
        return notes;
    }
    
    const {data, isError, isLoading} = useQuery({
        queryKey:['notes', subject_name, chapter_name],
        queryFn:getNotescontent,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // Map Notion page/block IDs to app routes using parent_id hierarchy resolution
    const mapPageUrl = useCallback((pageId: string) => {
        const { destination } = resolveNotionTarget({
            rawUrlOrId: pageId,
            chaptersData: data?.chaptersData,
            subjectName: subject_name || '',
            currentChapterName: chapter_name,
            recordMap: data?.recordMap
        });
        return destination || `/${pageId}`;
    }, [data?.chaptersData, subject_name, chapter_name, data?.recordMap]);

    // Helper to find the DOM element for a Notion block
    const getTargetBlockElement = (blockId: string): HTMLElement | null => {
        if (!blockId) return null;
        const rawClean = blockId.replaceAll('-', '').toLowerCase();

        let el =
            document.querySelector<HTMLElement>(`.notion-block-${rawClean}`) ||
            document.getElementById(rawClean) ||
            document.querySelector<HTMLElement>(`[data-id="${rawClean}"]`) ||
            document.querySelector<HTMLElement>(`[data-block-id="${rawClean}"]`);

        if (el) {
            if (el.classList.contains('notion-header-anchor') || el.classList.contains('notion-hash-link')) {
                const parentHeading = el.closest<HTMLElement>('.notion-h, h1, h2, h3, h4, h5, .notion-row');
                if (parentHeading) el = parentHeading;
            }
        }
        return el;
    };

    // Helper to scroll to block with top navbar offset & Notion-style flash highlight
    const scrollToBlockElement = (element: HTMLElement) => {
        const navbarOffset = 84; // Space for fixed navbar + padding
        const rect = element.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - navbarOffset;

        window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
        });

        // Trigger Notion flash highlight animation
        element.classList.remove('notion-block-highlighted');
        void element.offsetWidth; // force reflow
        element.classList.add('notion-block-highlighted');

        setTimeout(() => {
            element.classList.remove('notion-block-highlighted');
        }, 2400);
    };

    // Handle smooth scrolling to target block upon hash presence / page render
    useEffect(() => {
        if (isLoading || !data?.recordMap || !location.hash) return;

        const rawHash = location.hash.replace('#', '').replaceAll('-', '').toLowerCase();
        if (!rawHash) return;

        const scrollTimer = setTimeout(() => {
            const target = getTargetBlockElement(rawHash);
            if (target) {
                scrollToBlockElement(target);
            }
        }, 250);

        return () => clearTimeout(scrollTimer);
    }, [location.hash, isLoading, data?.recordMap]);

    // Custom Link and PageLink component to intercept Notion URLs and block anchors
    const CustomLink = useCallback(({ href, children, ...props }: any) => {
        if (!href) return <a {...props}>{children}</a>;

        const isNotionUrl = href.includes('notion.so');
        const isInternalPath = href.startsWith('/') || href.startsWith('#');

        if (isNotionUrl || isInternalPath) {
            const handleClick = (e: React.MouseEvent) => {
                // Allow default browser behavior for Cmd+Click / Ctrl+Click / middle-click to open in new tab
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) {
                    return;
                }
                e.preventDefault();

                let destination = href;

                // If it's a full Notion URL or raw ID, resolve it to an internal route
                if (isNotionUrl || (isInternalPath && extractNotionId(href.split('#')[0]))) {
                    const resolved = resolveNotionTarget({
                        rawUrlOrId: href,
                        chaptersData: data?.chaptersData,
                        subjectName: subject_name || '',
                        currentChapterName: chapter_name,
                        recordMap: data?.recordMap
                    });
                    if (resolved.destination) {
                        destination = resolved.destination;
                    }
                }

                const hashIndex = destination.indexOf('#');
                const destPath = hashIndex !== -1 ? destination.slice(0, hashIndex) : destination;
                const blockId = hashIndex !== -1 ? destination.slice(hashIndex + 1) : '';

                // Normalize paths for comparison
                const normalizePath = (p: string) => p.toLowerCase().replace(/\/+$/, '') || '/';
                const isCurrentPath = !destPath || normalizePath(destPath) === normalizePath(location.pathname);

                if (isCurrentPath && blockId) {
                    window.history.replaceState(null, '', destination);
                    const target = getTargetBlockElement(blockId);
                    if (target) {
                        scrollToBlockElement(target);
                    }
                } else {
                    navigate(destination);
                }
            };

            return (
                <a href={href} onClick={handleClick} {...props}>
                    {children}
                </a>
            );
        }

        return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
            </a>
        );
    }, [data?.chaptersData, subject_name, chapter_name, data?.recordMap, location.pathname, navigate]);

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
            <div className='w-full text-black dark:text-white px-3 py-3 sm:px-6 sm:py-4 fixed z-10 flex gap-2 sm:gap-3 items-center bg-white/80 dark:bg-black/80 backdrop-blur-sm'>
                <div className='shrink-0'>
                    <Dropdown chaptersData={data?.chaptersData} subject_name={subject_name || ""} chapter_name={chapter_name}/>
                </div>  
                <div className='text-lg sm:text-2xl md:text-4xl tracking-[-1.28px] font-semibold truncate min-w-0'>
                    <h2>{subject_name?.replaceAll("-", " ")}</h2>
                </div>
                <div className='shrink-0 ml-auto'>
                    <Backtohome/>
                </div>
            </div>
            {(!data?.recordMap?.block || Object.keys(data.recordMap.block).length === 0) ? (
                <div className="w-full max-w-3xl mx-auto px-4 py-20 text-center">
                    <div className="text-neutral-400 text-lg font-medium mb-2">Content Unavailable</div>
                    <p className="text-neutral-500 text-sm">This content is temporarily unavailable.</p>
                </div>
            ) : (
                <NotionErrorBoundary>
                    <NotionRenderer 
                        recordMap={data?.recordMap} 
                        fullPage={true} 
                        darkMode={isDark} 
                        disableHeader={true}
                        mapPageUrl={mapPageUrl}
                        components={{
                            Code,
                            Link: CustomLink,
                            PageLink: CustomLink
                        }}
                    />
                </NotionErrorBoundary>
            )}
            {
              data?.chaptersData?<Notenavbar chapterList={data.chaptersData} subjectName={subject_name || ""}/>  : null
            }
            
        </div>
    )
}