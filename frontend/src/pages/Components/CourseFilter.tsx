import { Filter, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CourseFilterProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export default function CourseFilter({ tags, selectedTag, onSelectTag }: CourseFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={`flex items-center justify-center p-2.5 rounded-lg border transition-colors duration-200 cursor-pointer ${
              selectedTag
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                : "border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            }`}
            aria-label="Filter courses"
            title="Filter courses by tag"
          />
        }
      >
        <Filter className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => onSelectTag(null)}
            className="flex items-center justify-between text-xs cursor-pointer"
          >
            <span>All Courses</span>
            {selectedTag === null && <Check className="w-3.5 h-3.5 text-indigo-400" />}
          </DropdownMenuItem>
          {tags.map((tag) => (
            <DropdownMenuItem
              key={tag}
              onClick={() => onSelectTag(tag)}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span>{tag}</span>
              {selectedTag === tag && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

