"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { stopSpeech, setGlobalMuteState } from "@/lib/google-tts";

import { triggerAgenQOpen } from "@/components/AgenQAgent";

// openAgenQWidget — called by every "Ask Nina" button and toggleChat in the app.
// Delegates to triggerAgenQOpen which re-calls AGENQ.render() with initialState:"OPEN"
export function openAgenQWidget() {
    triggerAgenQOpen();
}




interface ChatContextType {
    isOpen: boolean;
    width: number;
    externalMessage: string | null;
    hasGreeted: boolean;
    setHasGreeted: (val: boolean) => void;
    isMuted: boolean;
    setIsMuted: (val: boolean) => void;
    isWorkflowPaused: boolean;
    setIsWorkflowPaused: (val: boolean) => void;
    isWorkflowActive: boolean;
    setIsWorkflowActive: (val: boolean) => void;
    toggleChat: () => void;
    openChat: (message?: string, silent?: boolean) => void;
    closeChat: () => void;
    clearExternalMessage: () => void;
    updateWidth: (newWidth: number) => void;
    isFloating: boolean;
    setIsFloating: (val: boolean) => void;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    submittedClaimId: string | null;
    setSubmittedClaimId: (id: string | null) => void;
}


const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [width, setWidth] = useState(384);
    const [externalMessage, setExternalMessage] = useState<string | null>(null);
    const [hasGreeted, setHasGreetedState] = useState(false);
    const [isMuted, setIsMutedState] = useState(false);
    const [isWorkflowPaused, setIsWorkflowPaused] = useState(false);
    const [isWorkflowActive, setIsWorkflowActive] = useState(false);
    const [isFloating, setIsFloating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);

    // Load saved states from storage
    useEffect(() => {
        const savedWidth = localStorage.getItem("chat_panel_width");
        if (savedWidth) {
            setWidth(parseInt(savedWidth, 10));
        }
    }, []);

    const setHasGreeted = useCallback((val: boolean) => {
        setHasGreetedState(val);
    }, []);

    const toggleChat = useCallback(() => {
        // Trigger the real AgenQ SDK widget
        openAgenQWidget();
    }, []);

    const openChat = useCallback((message?: string, silent: boolean = false) => {
        // Trigger the real AgenQ SDK widget
        openAgenQWidget();
    }, []);

    const closeChat = useCallback(() => {
        stopSpeech();
        setIsOpen(false);
        setIsFloating(false);
        setIsExpanded(false);
        setIsWorkflowActive(false);
        setIsWorkflowPaused(false);
    }, []);

    const clearExternalMessage = useCallback(() => setExternalMessage(null), []);

    const updateWidth = useCallback((newWidth: number) => {
        const clampedWidth = Math.min(Math.max(newWidth, 280), 800);
        setWidth(clampedWidth);
        localStorage.setItem("chat_panel_width", clampedWidth.toString());
    }, []);

    const setIsMuted = useCallback((val: boolean) => {
        setIsMutedState(val);
        setGlobalMuteState(val);
    }, []);

    return (
        <ChatContext.Provider value={{
            isOpen,
            width,
            externalMessage,
            hasGreeted,
            setHasGreeted,
            isMuted,
            setIsMuted,
            isWorkflowPaused,
            setIsWorkflowPaused,
            isWorkflowActive,
            setIsWorkflowActive,
            toggleChat,
            openChat,
            closeChat,
            clearExternalMessage,
            updateWidth,
            isFloating,
            setIsFloating,
            isExpanded,
            setIsExpanded,
            submittedClaimId,
            setSubmittedClaimId
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}
