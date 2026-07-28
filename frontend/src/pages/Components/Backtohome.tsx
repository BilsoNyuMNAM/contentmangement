import { useNavigate } from "react-router"


export default function Backtohome(){
    const navigate = useNavigate();
    return(
        <div className="p-5 bg-black text-white rounded-lg">
            <button onClick={() => navigate("/")}>HOME</button>
        </div>
    )
}