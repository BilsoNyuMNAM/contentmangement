

async function baseRequest({endpoint, method, body, params}: {endpoint: string, method: string, body?: any, params?: any}) {

    const response = await fetch(`${import.meta.env.VITE_API_URL}/${endpoint}?${new URLSearchParams(params)}`,{
        method:method,
        headers:{
            'Content-Type':'application/json',
            
        },
        body: JSON.stringify(body)
       
    })
     const data = await response.json();
    //  if(!response.ok){
    //     window.location.href = "/notfound";
    //  }
    if(!response.ok){
        throw new Error(data.error || 'An error occurred');
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


export {getAllCourses, getNotes}

