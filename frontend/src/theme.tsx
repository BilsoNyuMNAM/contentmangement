import { createContext, useState, useEffect, type ReactNode } from "react";

export interface ThemeContextType {
    currentTheme: string;
    setTheme: () => void;
}

const theme = createContext<ThemeContextType | null>(null); //context object


function Themeprovider({children}: {children: ReactNode}){
    const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'dark');

    // Sync the `dark` class on <html> so Tailwind's dark: variant
    // and shadcn's .dark CSS variables actually take effect.
    useEffect(() => {
        if (currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [currentTheme]);

    function setTheme(){
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setCurrentTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }
    return(
        <theme.Provider value={{currentTheme, setTheme}}>
            {children}
        </theme.Provider>
    )
}

export {theme, Themeprovider};

