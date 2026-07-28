import CourseCard from "../Components/CourseCard";
import Coursehero from "../Components/Coursehero";
import {getAllCourses} from "../../service/centralisedApi"
import { useQuery } from "@tanstack/react-query";
export default function Allcourse(){
    const {data, isLoading, isError} = useQuery({
        queryKey:["courses"],
        queryFn: getAllCourses
    })
    console.log("data", data)
    
    if(isLoading){
        return <div>Loading...</div>
    }

    if(isError || !data){
        return <div className="h-screen bg-black text-white flex justify-center items-center">Failed to load courses. Please try again later.</div>
    }

    return(
        <div className="w-full min-h-screen flex  justify-center bg-black">
            
            <div className="w-full max-w-4xl px-6 mt-10 py-8">   
                <div>
                    <Coursehero/>
                </div>
                <div className="mt-10">
                    {
                        data.data?.map((course)=>{
                            return(
                                <CourseCard subject_name={course.title} description= {course.description} />
                            )
                        })
                    }
                </div>
            </div>
            
        </div>
    )
}