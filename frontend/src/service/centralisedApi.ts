

async function baseRequest({endpoint, method, body}: {endpoint: string, method: string, body?: any}) {

    const response = await fetch(`${import.meta.env.VITE_API_URL}/${endpoint}`,{
        method:method,
        headers:{
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
       
    })
     const data = await response.json();
    return data;
}

async function getAllCourses(){
    return baseRequest({endpoint:'courses', method:'GET'});
}


export {getAllCourses}

