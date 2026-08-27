import React, { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export default class NotionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("NotionRenderer crashed:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full max-w-3xl mx-auto px-4 py-20 text-center">
                    <div className="text-neutral-400 text-lg font-medium mb-2">Content Unavailable</div>
                    <p className="text-neutral-500 text-sm">This content is temporarily unavailable. Please try refreshing the page.</p>
                </div>
            );
        }
        return this.props.children;
    }
}
