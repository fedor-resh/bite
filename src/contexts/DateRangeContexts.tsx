import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

dayjs.extend(isoWeek);

interface DateRangeContextType {
	currentDate: Dayjs;
	setCurrentDate: (date: Dayjs) => void;
	datesFromTo: [Date | null, Date | null];
	setDatesFromTo: (dates: [Date | null, Date | null]) => void;
	mondayOfWeek: Date;
	sundayOfWeek: Date;
	goToPreWeek: () => void;
	goToNextWeek: () => void;
}

export const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
	const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());

	const mondayOfWeek = useMemo(() => currentDate.isoWeekday(1).toDate(), [currentDate]);
	const sundayOfWeek = useMemo(() => currentDate.isoWeekday(7).toDate(), [currentDate]);

	const [datesFromTo, setDatesFromTo] = useState<[Date | null, Date | null]>([
		mondayOfWeek,
		sundayOfWeek,
	]);

	useEffect(() => {
		setDatesFromTo([mondayOfWeek, sundayOfWeek]);
	}, [mondayOfWeek, sundayOfWeek]);

	const goToPreWeek = useCallback(() => {
		setCurrentDate((prev) => prev.clone().subtract(1, "week"));
	}, []);

	const goToNextWeek = useCallback(() => {
		setCurrentDate((prev) => prev.clone().add(1, "week"));
	}, []);

	const value = useMemo(
		() => ({
			currentDate,
			setCurrentDate,
			datesFromTo,
			setDatesFromTo,
			mondayOfWeek,
			sundayOfWeek,
			goToPreWeek,
			goToNextWeek,
		}),
		[currentDate, datesFromTo, mondayOfWeek, sundayOfWeek, goToPreWeek, goToNextWeek],
	);

	return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}
