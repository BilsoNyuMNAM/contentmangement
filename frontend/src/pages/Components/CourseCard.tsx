import { useNavigate } from "react-router"

export default function CourseCard({subject_name, description}:{subject_name:string, description:string}){
    const navigate  = useNavigate();
    return(
        <div>
            <div className="px-6 py-6 rounded-lg border mb-4 border-[#9ca3af] ">
                <div className="flex flex-row gap-6 items-center justify-between">
                    <div className="flex flex-row gap-2 gap-2 flex-1">
                        <div className="h-8 w-2 border-2 bg-[#9ca3af]"></div>
                        <div>
                            <div>
                                <h1 className="font-extrabold text-2xl text-white font-spaceMono">{subject_name}</h1>
                            </div>
                            <div className="text-[#9ca3af]">
                                <p>{description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-white flex border rounded-lg px-4 py-2">
                        <button className="font-spaceMono" onClick={()=>navigate(`/${subject_name.replaceAll(" ", "-")}`)}> Start <span>→</span></button>
                    </div>
                </div>
            </div>
        </div>
    )
}