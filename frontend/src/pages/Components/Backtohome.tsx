import { useNavigate } from "react-router"


export default function Backtohome(){
    const navigate = useNavigate();
    return(
        <div className="p-2 sm:p-3 bg-neutral-100 dark:bg-black text-black dark:text-white rounded-lg">
            <button className="text-xs sm:text-sm font-medium" onClick={() => navigate("/")}>HOME</button>
        </div>
    )
}