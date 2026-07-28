
Problem 1:
/:section_name/:notes_name
    How do i get the "section_name" and "notes_name"???
    
    : useParams()hook , 
    you will use this hook in that component where you need the name , 
    

navigate(`/${subject_name.toLowerCase().replaceAll(" ", "-")} 
Before: http://localhost:5173/React%20Foundations
After: http://localhost:5173/react-foundations

Problem 2:
    Could not find valid path aliases or package imports for init.
    Configure path aliases in tsconfig.json or imports in package.json, then run init again.
    Learn more at https://ui.shadcn.com/docs/installation/manual#configure-import-aliases.

    @ is the shortcut of the /src folder 



Problem 3:  cannot find module @/lib/utils or its corresponsing type declaration




Problem 4: useLocation state is undefined problem "src/pages/component/coursecard.tsx"
    - explaination:
        - The location.state only exists in memory during a specific navigation session.
        - If a user refreshes the page or pastes the link into a new tab, that memory state is gone, leaving subject_id undefined.
    - solution:
        <Route path="/:subject_name" element={<Noteui/>}/>
                const {subject_name} = useParams();




problem 5:
    - SOLUTION: 
        if (!chapter_name && notes.chaptersData && notes.chaptersData.length > 0) {
                navigate(`/${subject_name}/${notes.chaptersData[0].chapterName.replaceAll(" ", "-")}`, { replace: true });
            }




