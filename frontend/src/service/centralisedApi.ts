

async function baseRequest({endpoint, method, body, params, headers}: {endpoint: string, method: string, body?: any, params?: any, headers?: Record<string, string>}) {
    const adminKey = typeof window !== 'undefined' ? sessionStorage.getItem('admin_key') : null;
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(adminKey ? { 'x-admin-key': adminKey } : {}),
        ...headers
    };

    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const url = params && Object.keys(params).length > 0 
        ? `${baseUrl}/${cleanEndpoint}?${new URLSearchParams(params)}`
        : `${baseUrl}/${cleanEndpoint}`;

    const response = await fetch(url, {
        method: method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || 'An error occurred');
    }
    return data;
}

async function getAllCourses(){
    return baseRequest({endpoint:'tag', method:'GET'});
}

async function getNotes(subject_name:string, chapter_name?:string){
    const params: any = {subject_name};
    if (chapter_name) {
        params.chapter_name = chapter_name;
    }
    return baseRequest({endpoint:"notes", method:"GET", params});
}

async function verifyAdminKey(key: string) {
    return baseRequest({ endpoint: 'admin/verify', method: 'POST', headers: { 'x-admin-key': key } });
}

async function extractChapters(notionPageId: string) {
    return baseRequest({ endpoint: 'admin/extract-chapters', method: 'POST', body: { notionPageId } });
}

async function createCourse(data: { title: string; tagName: string; description?: string; chapters: { pageId: string; title: string }[] }) {
    return baseRequest({ endpoint: 'admin/create-course', method: 'POST', body: data });
}

async function getAdminCourses() {
    return baseRequest({ endpoint: 'admin/courses', method: 'GET' });
}

async function addChapter(data: { courseId: number; notionPageId: string; chapterName?: string; position?: number }) {
    return baseRequest({ endpoint: 'admin/add-chapter', method: 'POST', body: data });
}

async function getAdminTags() {
    return baseRequest({ endpoint: 'admin/tags', method: 'GET' });
}

async function deleteCourse(courseId: number) {
    return baseRequest({ endpoint: `admin/course/${courseId}`, method: 'DELETE' });
}

async function deleteChapter(chapterId: number) {
    return baseRequest({ endpoint: `admin/chapter/${chapterId}`, method: 'DELETE' });
}

async function searchContent(query: string) {
    return baseRequest({ endpoint: 'search', method: 'GET', params: { q: query } });
}

async function updateCourse(id: number, data: { title?: string; description?: string; tagName?: string; status?: 'DRAFT' | 'PUBLISHED' }) {
    return baseRequest({ endpoint: `admin/course/${id}`, method: 'PUT', body: data });
}

async function updateChapter(id: number, data: { chapterName?: string; notionPageId?: string; order?: number }) {
    return baseRequest({ endpoint: `admin/chapter/${id}`, method: 'PUT', body: data });
}

async function reorderChapters(courseId: number, chapterIds: number[]) {
    return baseRequest({ endpoint: `admin/course/${courseId}/reorder`, method: 'PUT', body: { chapterIds } });
}

async function syncCourseFromNotion(courseId: number) {
    return baseRequest({ endpoint: `admin/course/${courseId}/sync`, method: 'POST' });
}

async function clearServerCache() {
    return baseRequest({ endpoint: 'admin/cache/clear', method: 'POST' });
}

export { 
    getAllCourses, 
    getNotes, 
    verifyAdminKey, 
    extractChapters, 
    createCourse, 
    getAdminCourses, 
    getAdminTags, 
    addChapter, 
    deleteCourse, 
    deleteChapter,
    searchContent,
    updateCourse,
    updateChapter,
    reorderChapters,
    syncCourseFromNotion,
    clearServerCache
};
