import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom"

export default function Dropdown({ chaptersData, subject_name }: { chaptersData: any[] | null , subject_name:string}) {
    const navigate = useNavigate();
    return (
        <div>
            <DropdownMenu >
                <DropdownMenuTrigger render={<Button variant="outline" className={"text-white bg-black font-spaceMono "} />}>
                    Chapters
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    
                    <DropdownMenuGroup >
                    {chaptersData && chaptersData.map((chapter) => (
                        <DropdownMenuItem key={chapter.id} onClick={()=>navigate(`/${subject_name}/${chapter.chapterName}`)}>{chapter.chapterName}</DropdownMenuItem>
                    ))}
                    </DropdownMenuGroup>
                    {/* <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                    <DropdownMenuItem>Team</DropdownMenuItem>
                    <DropdownMenuItem>Subscription</DropdownMenuItem>
                    </DropdownMenuGroup> */}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}