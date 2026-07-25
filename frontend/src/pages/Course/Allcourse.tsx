import CourseCard from "../Components/CourseCard";
import Coursehero from "../Components/Coursehero";
import {getAllCourses} from "../../service/centralisedApi"
import { useEffect, useState } from "react";
export default function Allcourse(){
    const [coursesData, setCoursesData] = useState(null);
    async function fetchCourses(){
        // console.log("2. inside the fetchCourse function ")
        const result = await getAllCourses();
        // console.log("3. Fetched courses data:", result);
        setCoursesData(result.data);
    }
    useEffect(() => {
        // console.log("1. Fetching courses data...");
        fetchCourses();

    }, []);
    if(!coursesData){
        return <div>Loading...</div>
    }

    return(
        <div className="w-full min-h-screen flex  justify-center bg-black">
            
            <div className="w-full max-w-4xl px-6 mt-10 py-8">   
                <div>
                    <Coursehero/>
                </div>
                <div className="mt-10">
                    {
                        coursesData?.map((course)=>{
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