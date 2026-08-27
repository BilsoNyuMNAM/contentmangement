import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { 
    extractChapters, 
    createCourse, 
    getAdminCourses, 
    getAdminTags, 
    addChapter, 
    deleteCourse, 
    deleteChapter, 
    verifyAdminKey,
    updateCourse,
    updateChapter,
    syncCourseFromNotion,
    clearServerCache
} from "../../service/centralisedApi";
import { 
    Plus, 
    BookOpen, 
    Layers, 
    Lock, 
    ShieldCheck, 
    LogOut, 
    CheckCircle2, 
    ExternalLink, 
    X, 
    Trash2, 
    ChevronDown, 
    Tag,
    RefreshCw,
    Edit3,
    Eye,
    EyeOff,
    Sparkles,
    Check
} from "lucide-react";

interface ExtractedChapter {
    pageId: string;
    title: string;
    checked: boolean;
}

interface Chapter {
    id: number;
    chapterName: string;
    pageId: string;
    order: number | null;
}

interface CourseItem {
    id: number;
    title: string;
    description: string | null;
    status: 'DRAFT' | 'PUBLISHED';
    chapters: Chapter[];
    tags: { id: number; tagName: string } | null;
}

interface SuccessInfo {
    type: 'course' | 'chapter' | 'delete_course' | 'delete_chapter' | 'sync' | 'edit_course' | 'edit_chapter' | 'cache_clear' | 'status_change';
    title: string;
    courseName: string;
    chapterCount?: number;
    tagName?: string;
    position?: number;
    detail?: string;
}

export default function AdminPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'create' | 'add-chapter'>('create');
    
    // --- Auth State ---
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return typeof window !== 'undefined' && !!sessionStorage.getItem('admin_key');
    });
    const [passcode, setPasscode] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // --- Global Success Notification ---
    const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);

    async function handleUnlock(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!passcode.trim()) return;
        setVerifying(true);
        setAuthError(null);
        try {
            await verifyAdminKey(passcode.trim());
            sessionStorage.setItem('admin_key', passcode.trim());
            setIsAuthenticated(true);
            setPasscode("");
        } catch (err: any) {
            setAuthError(err.message || "Invalid admin passcode.");
        } finally {
            setVerifying(false);
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('admin_key');
        setIsAuthenticated(false);
    }
    
    // --- Create Course State ---
    const [title, setTitle] = useState("");
    const [tagName, setTagName] = useState("");
    const [notionPageId, setNotionPageId] = useState("");
    const [description, setDescription] = useState("");
    const [createStatus, setCreateStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
    
    const [chapters, setChapters] = useState<ExtractedChapter[]>([]);
    const [extracting, setExtracting] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);
    
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // --- Add / Manage Chapter State ---
    const [courses, setCourses] = useState<CourseItem[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [chapterNotionId, setChapterNotionId] = useState("");
    const [customChapterName, setCustomChapterName] = useState("");
    const [positionChoice, setPositionChoice] = useState<string>("end");
    
    const [addingChapter, setAddingChapter] = useState(false);
    const [addChapterError, setAddChapterError] = useState<string | null>(null);

    // --- Edit Course Modal State ---
    const [isEditingCourse, setIsEditingCourse] = useState(false);
    const [editCourseTitle, setEditCourseTitle] = useState("");
    const [editCourseTag, setEditCourseTag] = useState("");
    const [editCourseDesc, setEditCourseDesc] = useState("");
    const [editCourseStatus, setEditCourseStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
    const [savingCourse, setSavingCourse] = useState(false);

    // --- Edit Chapter Modal / Inline State ---
    const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
    const [editChapterTitle, setEditChapterTitle] = useState("");
    const [editChapterPageId, setEditChapterPageId] = useState("");
    const [savingChapter, setSavingChapter] = useState(false);

    // --- Sync & Cache State ---
    const [syncingCourseId, setSyncingCourseId] = useState<number | null>(null);
    const [clearingCache, setClearingCache] = useState(false);

    // --- Deletion State ---
    const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
    const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);
    const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<number | null>(null);
    const [deletingChapterId, setDeletingChapterId] = useState<number | null>(null);

    // --- Tag Combobox State ---
    const [availableTags, setAvailableTags] = useState<{ id: number; tagName: string }[]>([]);
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const tagComboRef = useRef<HTMLDivElement>(null);

    // Fetch existing tags for combobox
    async function fetchTags() {
        try {
            const data = await getAdminTags();
            setAvailableTags(data.tags || []);
        } catch (err: any) {
            console.error("Failed to load tags:", err);
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchTags();
        }
    }, [isAuthenticated]);

    // Close tag dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (tagComboRef.current && !tagComboRef.current.contains(e.target as Node)) {
                setTagDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredTags = tagName.trim()
        ? availableTags.filter(t => t.tagName.toLowerCase().includes(tagName.trim().toLowerCase()))
        : availableTags;

    const isNewTag = tagName.trim() !== "" && !availableTags.some(t => t.tagName.toLowerCase() === tagName.trim().toLowerCase());

    // Fetch existing courses for Add Chapter tab
    async function fetchCourses() {
        setLoadingCourses(true);
        try {
            const data = await getAdminCourses();
            setCourses(data.courses || []);
            if (data.courses && data.courses.length > 0) {
                if (!selectedCourseId || !data.courses.some((c: CourseItem) => String(c.id) === selectedCourseId)) {
                    setSelectedCourseId(String(data.courses[0].id));
                }
            } else {
                setSelectedCourseId("");
            }
        } catch (err: any) {
            console.error("Failed to load courses:", err);
        } finally {
            setLoadingCourses(false);
        }
    }

    useEffect(() => {
        if (activeTab === 'add-chapter' && isAuthenticated) {
            fetchCourses();
        }
    }, [activeTab, isAuthenticated]);

    // Handle Create Course Extraction
    async function handleExtract() {
        if (!notionPageId.trim()) return;
        setExtracting(true);
        setExtractError(null);
        setChapters([]);
        setSuccessInfo(null);
        setCreateError(null);
        try {
            const data = await extractChapters(notionPageId.trim());
            setChapters(data.chapters.map((ch: any) => ({ ...ch, checked: true })));
        } catch (err: any) {
            setExtractError(err.message || "Failed to extract chapters");
        } finally {
            setExtracting(false);
        }
    }

    function toggleChapter(index: number) {
        setChapters(prev => prev.map((ch, i) => i === index ? { ...ch, checked: !ch.checked } : ch));
    }

    async function handleCreate() {
        const selectedChapters = chapters.filter(ch => ch.checked).map(({ pageId, title }) => ({ pageId, title }));
        if (!title.trim() || !tagName.trim() || selectedChapters.length === 0) return;
        setCreating(true);
        setCreateError(null);
        setSuccessInfo(null);
        try {
            const courseTitle = title.trim();
            const tag = tagName.trim();
            const count = selectedChapters.length;

            await createCourse({
                title: courseTitle,
                tagName: tag,
                description: description.trim() || undefined,
                status: createStatus,
                chapters: selectedChapters
            } as any);

            setSuccessInfo({
                type: 'course',
                title: courseTitle,
                courseName: courseTitle,
                chapterCount: count,
                tagName: tag,
                detail: `Status: ${createStatus}`
            });

            queryClient.invalidateQueries({ queryKey: ["courses"] });
            fetchTags();

            setTitle("");
            setTagName("");
            setNotionPageId("");
            setDescription("");
            setChapters([]);
            setCreateStatus('PUBLISHED');
        } catch (err: any) {
            setCreateError(err.message || "Failed to create course");
        } finally {
            setCreating(false);
        }
    }

    // Handle Add Single Chapter Submit
    async function handleAddChapter() {
        if (!selectedCourseId || !chapterNotionId.trim()) return;
        setAddingChapter(true);
        setAddChapterError(null);
        setSuccessInfo(null);

        try {
            let pos: number | undefined;
            if (positionChoice === "start") {
                pos = 1;
            } else if (positionChoice !== "end") {
                pos = Number(positionChoice);
            }

            const res = await addChapter({
                courseId: Number(selectedCourseId),
                notionPageId: chapterNotionId.trim(),
                chapterName: customChapterName.trim() || undefined,
                position: pos
            });

            setSuccessInfo({
                type: 'chapter',
                title: res.chapter.chapterName,
                courseName: currentCourse?.title || "Course",
                position: res.chapter.order || undefined
            });

            queryClient.invalidateQueries({ queryKey: ["courses"] });

            setChapterNotionId("");
            setCustomChapterName("");
            setPositionChoice("end");
            
            await fetchCourses();
        } catch (err: any) {
            setAddChapterError(err.message || "Failed to add chapter");
        } finally {
            setAddingChapter(false);
        }
    }

    // Handle Edit Course
    function openEditCourseModal() {
        if (!currentCourse) return;
        setEditCourseTitle(currentCourse.title);
        setEditCourseTag(currentCourse.tags?.tagName || "");
        setEditCourseDesc(currentCourse.description || "");
        setEditCourseStatus(currentCourse.status || 'PUBLISHED');
        setIsEditingCourse(true);
    }

    async function handleSaveCourse() {
        if (!currentCourse || !editCourseTitle.trim()) return;
        setSavingCourse(true);
        try {
            await updateCourse(currentCourse.id, {
                title: editCourseTitle.trim(),
                description: editCourseDesc.trim() || undefined,
                tagName: editCourseTag.trim() || undefined,
                status: editCourseStatus
            });

            setSuccessInfo({
                type: 'edit_course',
                title: editCourseTitle.trim(),
                courseName: editCourseTitle.trim(),
                detail: `Status: ${editCourseStatus}`
            });

            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            setIsEditingCourse(false);
            await fetchCourses();
            fetchTags();
        } catch (err: any) {
            alert(err.message || "Failed to update course");
        } finally {
            setSavingCourse(false);
        }
    }

    // Toggle Course Status directly
    async function handleToggleStatus(course: CourseItem) {
        const nextStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
        try {
            await updateCourse(course.id, { status: nextStatus });
            setSuccessInfo({
                type: 'status_change',
                title: course.title,
                courseName: course.title,
                detail: `Course visibility changed to ${nextStatus}`
            });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            await fetchCourses();
        } catch (err: any) {
            alert(err.message || "Failed to toggle course status");
        }
    }

    // Handle Edit Chapter
    function startEditChapter(ch: Chapter) {
        setEditingChapterId(ch.id);
        setEditChapterTitle(ch.chapterName);
        setEditChapterPageId(ch.pageId);
    }

    async function handleSaveChapter(chapterId: number) {
        if (!editChapterTitle.trim() || !editChapterPageId.trim()) return;
        setSavingChapter(true);
        try {
            await updateChapter(chapterId, {
                chapterName: editChapterTitle.trim(),
                notionPageId: editChapterPageId.trim()
            });

            setSuccessInfo({
                type: 'edit_chapter',
                title: editChapterTitle.trim(),
                courseName: currentCourse?.title || "Course"
            });

            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            setEditingChapterId(null);
            await fetchCourses();
        } catch (err: any) {
            alert(err.message || "Failed to update chapter");
        } finally {
            setSavingChapter(false);
        }
    }

    // Handle One-Click Sync from Notion
    async function handleSyncCourse(courseId: number) {
        setSyncingCourseId(courseId);
        try {
            const res = await syncCourseFromNotion(courseId);
            setSuccessInfo({
                type: 'sync',
                title: currentCourse?.title || "Course",
                courseName: currentCourse?.title || "Course",
                detail: res.message || "Course and chapters refreshed with latest Notion data."
            });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            await fetchCourses();
        } catch (err: any) {
            alert(err.message || "Failed to sync course from Notion");
        } finally {
            setSyncingCourseId(null);
        }
    }

    // Handle Clear All Server Caches
    async function handleClearAllCache() {
        setClearingCache(true);
        try {
            await clearServerCache();
            setSuccessInfo({
                type: 'cache_clear',
                title: "Server Cache",
                courseName: "",
                detail: "All Notion page caches and tag caches have been purged."
            });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
        } catch (err: any) {
            alert(err.message || "Failed to clear server cache");
        } finally {
            setClearingCache(false);
        }
    }

    // Handle Course Deletion
    async function handleDeleteCourse(courseId: number) {
        const courseToDelete = courses.find(c => c.id === courseId);
        setDeletingCourseId(courseId);
        try {
            await deleteCourse(courseId);
            setSuccessInfo({
                type: 'delete_course',
                title: courseToDelete?.title || "Course",
                courseName: courseToDelete?.title || "Course"
            });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            setConfirmDeleteCourse(false);
            await fetchCourses();
        } catch (err: any) {
            alert(err.message || "Failed to delete course");
        } finally {
            setDeletingCourseId(null);
        }
    }

    // Handle Single Chapter Deletion
    async function handleDeleteChapter(chapterId: number) {
        const chapterToDelete = currentCourse?.chapters.find(ch => ch.id === chapterId);
        setDeletingChapterId(chapterId);
        try {
            await deleteChapter(chapterId);
            setSuccessInfo({
                type: 'delete_chapter',
                title: chapterToDelete?.chapterName || "Chapter",
                courseName: currentCourse?.title || "Course"
            });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.removeQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            setConfirmDeleteChapterId(null);
            await fetchCourses();
        } catch (err: any) {
            alert(err.message || "Failed to delete chapter");
        } finally {
            setDeletingChapterId(null);
        }
    }

    const selectedCount = chapters.filter(ch => ch.checked).length;
    const currentCourse = courses.find(c => String(c.id) === selectedCourseId);
    
    // --- Render Lock Screen if Not Authenticated ---
    if (!isAuthenticated) {
        return (
            <div className="w-full min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans antialiased flex items-center justify-center p-4">
                <div className="w-full max-w-md p-6 sm:p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e0e0e] shadow-sm text-center">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-600 dark:text-neutral-300">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-semibold mb-1">Admin Access Required</h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
                        Please enter your admin passcode to access this panel.
                    </p>
                    
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                autoFocus
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="Enter Admin Passcode..."
                                className="w-full p-2.5 text-center border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 font-mono tracking-widest"
                            />
                        </div>
                        {authError && (
                            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900/60">
                                {authError}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={verifying || !passcode.trim()}
                            className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                            {verifying ? "Verifying..." : "Unlock Panel"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer mt-2"
                        >
                            ← Back to Home
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans antialiased">
            <div className="w-full max-w-3xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
                        <span className="flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                            <ShieldCheck className="w-3 h-3" />
                            Authenticated
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleClearAllCache}
                            disabled={clearingCache}
                            title="Purge all Notion page and tag caches"
                            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Purge Cache</span>
                        </button>
                        <button 
                            onClick={() => navigate("/")}
                            className="px-3 py-1.5 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                            Back to Home
                        </button>
                        <button 
                            onClick={handleLogout}
                            title="Lock Admin Panel"
                            className="px-2.5 py-1.5 text-sm font-medium rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-xs">Lock</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6 gap-2">
                    <button
                        onClick={() => { setActiveTab('create'); setSuccessInfo(null); }}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                            activeTab === 'create'
                                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold'
                                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        Create Course
                    </button>
                    <button
                        onClick={() => { setActiveTab('add-chapter'); setSuccessInfo(null); }}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                            activeTab === 'add-chapter'
                                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold'
                                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        Manage Chapters & Courses
                    </button>
                </div>

                {/* Global Success Notification Banner */}
                {successInfo && (
                    <div className="p-4 rounded-xl border border-green-200 dark:border-green-800/80 bg-green-50/90 dark:bg-green-950/40 text-green-900 dark:text-green-200 flex items-start justify-between gap-3 mb-6 shadow-sm">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                                    {successInfo.type === 'course' && '🎉 Course Created Successfully!'}
                                    {successInfo.type === 'chapter' && '✅ Chapter Added Successfully!'}
                                    {successInfo.type === 'edit_course' && '✏️ Course Updated Successfully!'}
                                    {successInfo.type === 'edit_chapter' && '✏️ Chapter Updated Successfully!'}
                                    {successInfo.type === 'status_change' && '👁️ Visibility Status Updated!'}
                                    {successInfo.type === 'sync' && '🔄 Notion Sync Complete!'}
                                    {successInfo.type === 'cache_clear' && '🧹 Cache Cleared!'}
                                    {successInfo.type === 'delete_course' && '🗑️ Course Deleted Successfully!'}
                                    {successInfo.type === 'delete_chapter' && '🗑️ Chapter Deleted Successfully!'}
                                </h3>
                                <p className="text-xs text-green-700 dark:text-green-400 mt-1 leading-relaxed">
                                    {successInfo.type === 'course' && (
                                        <>Course <strong>"{successInfo.title}"</strong> with <strong>{successInfo.chapterCount} chapters</strong> under tag <strong>#{successInfo.tagName}</strong> is now saved ({successInfo.detail}).</>
                                    )}
                                    {successInfo.type === 'chapter' && (
                                        <>Chapter <strong>"{successInfo.title}"</strong> was added to <strong>"{successInfo.courseName}"</strong>{successInfo.position ? ` at Position #${successInfo.position}` : ''}.</>
                                    )}
                                    {successInfo.type === 'edit_course' && (
                                        <>Course <strong>"{successInfo.title}"</strong> details were updated successfully ({successInfo.detail}).</>
                                    )}
                                    {successInfo.type === 'edit_chapter' && (
                                        <>Chapter <strong>"{successInfo.title}"</strong> in <strong>"{successInfo.courseName}"</strong> was updated.</>
                                    )}
                                    {successInfo.type === 'status_change' && (
                                        <>{successInfo.detail}</>
                                    )}
                                    {successInfo.type === 'sync' && (
                                        <>{successInfo.detail}</>
                                    )}
                                    {successInfo.type === 'cache_clear' && (
                                        <>{successInfo.detail}</>
                                    )}
                                    {successInfo.type === 'delete_course' && (
                                        <>Course <strong>"{successInfo.title}"</strong> and all of its chapters have been removed.</>
                                    )}
                                    {successInfo.type === 'delete_chapter' && (
                                        <>Chapter <strong>"{successInfo.title}"</strong> was removed from <strong>"{successInfo.courseName}"</strong>. Remaining chapters have been renumbered.</>
                                    )}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    {successInfo.type !== 'delete_course' && successInfo.type !== 'cache_clear' && (
                                        <button
                                            onClick={() => navigate(`/${encodeURIComponent(successInfo.courseName.replaceAll(" ", "-"))}`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-green-700 dark:bg-green-600 text-white hover:bg-green-800 dark:hover:bg-green-500 transition-colors cursor-pointer"
                                        >
                                            View Course
                                            <ExternalLink className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate("/")}
                                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-white dark:bg-neutral-900 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                    >
                                        Go to Home
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSuccessInfo(null)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 p-1 rounded transition-colors cursor-pointer"
                            title="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                
                {/* TAB 1: CREATE COURSE */}
                {activeTab === 'create' && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e0e0e]">
                            <h2 className="text-lg font-medium mb-4">Step 1: Course Details</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Course Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                        placeholder="e.g. Introduction to React"
                                    />
                                </div>
                                
                                <div ref={tagComboRef} className="relative">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tag Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={tagName}
                                            onChange={(e) => {
                                                setTagName(e.target.value);
                                                setTagDropdownOpen(true);
                                            }}
                                            onFocus={() => setTagDropdownOpen(true)}
                                            className="w-full p-2 pr-8 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                            placeholder="Select existing tag or type a new one..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                    
                                    {/* Dropdown */}
                                    {tagDropdownOpen && (
                                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
                                            {filteredTags.length > 0 ? (
                                                filteredTags.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setTagName(t.tagName);
                                                            setTagDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                                                            tagName.toLowerCase() === t.tagName.toLowerCase()
                                                                ? 'bg-neutral-100 dark:bg-neutral-800 font-medium'
                                                                : ''
                                                        }`}
                                                    >
                                                        <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                                        <span className="text-neutral-800 dark:text-neutral-200">{t.tagName}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-xs text-neutral-400 italic">No matching tags found.</div>
                                            )}
                                            
                                            {/* "Create new tag" option */}
                                            {isNewTag && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTagDropdownOpen(false)}
                                                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800 bg-green-50/60 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                                    <span className="text-green-700 dark:text-green-300 font-medium">Create new tag: "{tagName.trim()}"</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {isNewTag && !tagDropdownOpen && (
                                        <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <Plus className="w-3 h-3" />
                                            New tag "{tagName.trim()}" will be created automatically.
                                        </p>
                                    )}
                                </div>

                                {/* Visibility Status Option */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Publication Status</label>
                                    <div className="flex gap-3">
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                            createStatus === 'PUBLISHED'
                                                ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                                                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="status" 
                                                checked={createStatus === 'PUBLISHED'} 
                                                onChange={() => setCreateStatus('PUBLISHED')}
                                                className="hidden" 
                                            />
                                            <Eye className="w-3.5 h-3.5" />
                                            Published (Live for visitors)
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                            createStatus === 'DRAFT'
                                                ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                                                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="status" 
                                                checked={createStatus === 'DRAFT'} 
                                                onChange={() => setCreateStatus('DRAFT')}
                                                className="hidden" 
                                            />
                                            <EyeOff className="w-3.5 h-3.5" />
                                            Draft (Hidden from public)
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description (Optional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 h-24 resize-none"
                                        placeholder="Brief course description..."
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Parent Notion Page ID or URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={notionPageId}
                                            onChange={(e) => setNotionPageId(e.target.value)}
                                            className="flex-1 p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                            placeholder="Paste Notion page URL or 32-character ID..."
                                        />
                                        <button
                                            type="button"
                                            onClick={handleExtract}
                                            disabled={extracting || !notionPageId.trim()}
                                            className="px-4 py-2 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors whitespace-nowrap cursor-pointer"
                                        >
                                            {extracting ? "Extracting..." : "Extract Chapters"}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-500">Accepts full Notion URLs (e.g. <code>https://notion.so/...-3adfc...</code>) or bare 32-char IDs.</p>
                                    {extractError && <p className="mt-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900/60">{extractError}</p>}
                                </div>
                            </div>
                        </div>

                        {chapters.length > 0 && (
                            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e0e0e]">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-medium">Step 2: Select Chapters</h2>
                                    <span className="text-sm text-neutral-500">{selectedCount} of {chapters.length} selected</span>
                                </div>
                                
                                <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-2">
                                    {chapters.map((ch, index) => (
                                        <div key={ch.pageId} className="flex items-center gap-3 p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                                            <input
                                                type="checkbox"
                                                checked={ch.checked}
                                                onChange={() => toggleChapter(index)}
                                                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:checked:bg-neutral-100"
                                            />
                                            <span className="text-sm font-medium truncate flex-1">{ch.title}</span>
                                            <span className="text-xs text-neutral-500 font-mono">{ch.pageId}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div>
                                    <button
                                        onClick={handleCreate}
                                        disabled={creating || selectedCount === 0 || !title.trim() || !tagName.trim()}
                                        className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {creating ? "Creating Course & Indexing Text..." : "Create Course"}
                                    </button>
                                    {createError && <p className="mt-2 text-sm text-red-500 text-center">{createError}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: MANAGE CHAPTERS & COURSES */}
                {activeTab === 'add-chapter' && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e0e0e]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-medium flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    Manage Courses & Chapters
                                </h2>
                            </div>

                            {loadingCourses ? (
                                <div className="py-8 text-center text-neutral-500 text-sm">Loading courses...</div>
                            ) : courses.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-neutral-500 text-sm mb-4">No courses available. Please create a course first.</p>
                                    <button
                                        onClick={() => setActiveTab('create')}
                                        className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium cursor-pointer"
                                    >
                                        Go to Create Course
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* 1. Select Course Dropdown & Actions */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Select Course to Manage
                                        </label>
                                        <select
                                            value={selectedCourseId}
                                            onChange={(e) => {
                                                setSelectedCourseId(e.target.value);
                                                setConfirmDeleteCourse(false);
                                                setConfirmDeleteChapterId(null);
                                                setIsEditingCourse(false);
                                                setEditingChapterId(null);
                                            }}
                                            className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
                                        >
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.id}>
                                                    {course.status === 'DRAFT' ? '🔒 [DRAFT] ' : '🟢 '}
                                                    {course.title} ({course.chapters.length} {course.chapters.length === 1 ? 'chapter' : 'chapters'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Course Action Bar */}
                                    {currentCourse && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800">
                                            <div className="flex items-center gap-3">
                                                {/* Clear Monochrome Visibility Segmented Control */}
                                                <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-xs">
                                                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 pl-2 pr-1">Visibility:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => currentCourse.status !== 'PUBLISHED' && handleToggleStatus(currentCourse)}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                                            currentCourse.status === 'PUBLISHED'
                                                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs font-semibold'
                                                                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                                                        }`}
                                                    >
                                                        Published
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => currentCourse.status !== 'DRAFT' && handleToggleStatus(currentCourse)}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                                            currentCourse.status === 'DRAFT'
                                                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs font-semibold'
                                                                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                                                        }`}
                                                    >
                                                        Draft
                                                    </button>
                                                </div>

                                                {currentCourse.tags && (
                                                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                                        #{currentCourse.tags.tagName}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Edit Course Button */}
                                                <button
                                                    onClick={openEditCourseModal}
                                                    className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    Edit Course
                                                </button>

                                                {/* Sync with Notion Button (Monochrome Style) */}
                                                <button
                                                    onClick={() => handleSyncCourse(currentCourse.id)}
                                                    disabled={syncingCourseId === currentCourse.id}
                                                    className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                    title="Refresh chapters and search index from Notion"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCourseId === currentCourse.id ? 'animate-spin' : ''}`} />
                                                    {syncingCourseId === currentCourse.id ? 'Syncing...' : 'Sync Notion'}
                                                </button>

                                                {/* Delete Course Button */}
                                                {confirmDeleteCourse ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDeleteCourse(currentCourse.id)}
                                                            disabled={deletingCourseId === currentCourse.id}
                                                            className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer"
                                                        >
                                                            {deletingCourseId === currentCourse.id ? '...' : 'Confirm'}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteCourse(false)}
                                                            className="px-2 py-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteCourse(true)}
                                                        className="px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 transition-colors cursor-pointer flex items-center gap-1"
                                                        title="Delete entire course"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit Course Inline Panel */}
                                    {isEditingCourse && currentCourse && (
                                        <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-700 space-y-3 animate-in fade-in duration-150">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                                                    Edit Course Details
                                                </h3>
                                                <button
                                                    onClick={() => setIsEditingCourse(false)}
                                                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={editCourseTitle}
                                                    onChange={(e) => setEditCourseTitle(e.target.value)}
                                                    className="w-full p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Tag</label>
                                                    <input
                                                        type="text"
                                                        value={editCourseTag}
                                                        onChange={(e) => setEditCourseTag(e.target.value)}
                                                        className="w-full p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Visibility</label>
                                                    <select
                                                        value={editCourseStatus}
                                                        onChange={(e) => setEditCourseStatus(e.target.value as any)}
                                                        className="w-full p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="PUBLISHED">Published (Live for visitors)</option>
                                                        <option value="DRAFT">Draft (Hidden from visitors)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
                                                <textarea
                                                    value={editCourseDesc}
                                                    onChange={(e) => setEditCourseDesc(e.target.value)}
                                                    className="w-full p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:outline-none h-16 resize-none"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    onClick={() => setIsEditingCourse(false)}
                                                    className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveCourse}
                                                    disabled={savingCourse || !editCourseTitle.trim()}
                                                    className="px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-black rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    {savingCourse ? "Saving..." : "Save Changes"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chapters List (Clean, without arrow buttons) */}
                                    {currentCourse && (
                                        <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    Current Chapters ({currentCourse.chapters.length})
                                                </span>
                                            </div>

                                            {currentCourse.chapters.length === 0 ? (
                                                <p className="text-xs text-neutral-400 italic py-2">No chapters in this course yet.</p>
                                            ) : (
                                                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                                    {currentCourse.chapters.map((ch, idx) => (
                                                        <div key={ch.id} className="p-2 rounded bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800/80 group">
                                                            {editingChapterId === ch.id ? (
                                                                /* Inline Edit Chapter Form */
                                                                <div className="space-y-2 py-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-[11px] font-mono text-neutral-400">Editing #{idx + 1}</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={() => handleSaveChapter(ch.id)}
                                                                                disabled={savingChapter || !editChapterTitle.trim()}
                                                                                className="px-2 py-0.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                                                            >
                                                                                <Check className="w-3 h-3" />
                                                                                Save
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingChapterId(null)}
                                                                                className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[11px] cursor-pointer"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={editChapterTitle}
                                                                        onChange={(e) => setEditChapterTitle(e.target.value)}
                                                                        placeholder="Chapter title"
                                                                        className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={editChapterPageId}
                                                                        onChange={(e) => setEditChapterPageId(e.target.value)}
                                                                        placeholder="Notion Page ID or URL"
                                                                        className="w-full p-1.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                /* Regular Chapter Row */
                                                                <div className="flex items-center justify-between text-xs gap-2">
                                                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                                                        <span className="font-mono text-neutral-400 w-5">#{idx + 1}</span>
                                                                        <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{ch.chapterName}</span>
                                                                    </div>

                                                                    {/* Action buttons */}
                                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                        <span className="font-mono text-[10px] text-neutral-400 hidden sm:inline">{ch.pageId.slice(0, 8)}...</span>
                                                                        <button
                                                                            onClick={() => startEditChapter(ch)}
                                                                            title="Edit chapter title / page ID"
                                                                            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
                                                                        >
                                                                            <Edit3 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        {confirmDeleteChapterId === ch.id ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => handleDeleteChapter(ch.id)}
                                                                                    disabled={deletingChapterId === ch.id}
                                                                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                                                                >
                                                                                    {deletingChapterId === ch.id ? '...' : 'Delete'}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setConfirmDeleteChapterId(null)}
                                                                                    className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[10px] transition-colors cursor-pointer"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => setConfirmDeleteChapterId(ch.id)}
                                                                                title={`Delete "${ch.chapterName}"`}
                                                                                className="text-neutral-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. Add New Chapter to This Course */}
                                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                                            + Add New Chapter to This Course
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                                Notion Page ID or URL
                                            </label>
                                            <input
                                                type="text"
                                                value={chapterNotionId}
                                                onChange={(e) => setChapterNotionId(e.target.value)}
                                                className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                                placeholder="Paste Notion page URL or 32-character ID..."
                                            />
                                            <p className="mt-1 text-xs text-neutral-500">
                                                Paste the URL or ID of the specific Notion chapter page you want to add.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Custom Chapter Title (Optional) */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Chapter Title (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={customChapterName}
                                            onChange={(e) => setCustomChapterName(e.target.value)}
                                            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                            placeholder="Leave blank to auto-detect title from Notion"
                                        />
                                    </div>

                                    {/* 4. Position / Order Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                            Position in Course
                                        </label>
                                        <select
                                            value={positionChoice}
                                            onChange={(e) => setPositionChoice(e.target.value)}
                                            className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
                                        >
                                            <option value="end">
                                                At the end (Position {(currentCourse?.chapters.length || 0) + 1}) — Default
                                            </option>
                                            {currentCourse && currentCourse.chapters.length > 0 && (
                                                <option value="start">At the beginning (Position 1)</option>
                                            )}
                                            {currentCourse && currentCourse.chapters.length > 1 && (
                                                currentCourse.chapters.slice(0, -1).map((_, i) => (
                                                    <option key={i + 2} value={String(i + 2)}>
                                                        Insert at Position {i + 2}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <p className="mt-1 text-xs text-neutral-500">
                                            If inserted before existing chapters, subsequent chapters will automatically shift down by 1.
                                        </p>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleAddChapter}
                                            disabled={addingChapter || !selectedCourseId || !chapterNotionId.trim()}
                                            className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {addingChapter ? "Adding Chapter & Indexing Text..." : "Add Chapter to Course"}
                                        </button>
                                        {addChapterError && (
                                            <p className="mt-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900/60 text-center">
                                                {addChapterError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
