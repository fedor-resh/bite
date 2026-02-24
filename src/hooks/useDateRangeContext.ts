import { useContext } from "react";
import { DateRangeContext } from "@/contexts/DateRangeContexts";

export function useDateRangeContext() {
    const context = useContext(DateRangeContext);

    if (!context) {
        throw new Error('useDateRangeContext must be used within DateRangeProvider');
    }

    return context;
}