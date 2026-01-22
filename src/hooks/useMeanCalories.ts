import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useMemo } from "react";
import type { EatenProduct } from "@/types/types";

dayjs.extend(isBetween);

export function useMeanCalories(from: Date | null, to: Date | null, foods: EatenProduct[]): number {
	return useMemo(() => {
		if (!from || !to) {
			return 0;
		}

		const startDate = dayjs(from).startOf("day");
		const endDate = dayjs(to).endOf("day");

		const intervalEntries = foods.filter(
			(e) => e.date && dayjs(e.date).isBetween(startDate, endDate, "day", "[]"),
		);

		const totalCaloriesPerInterval = intervalEntries.reduce((acc, el) => {
			const kcalories = el.kcalories ?? 0;
			const value = el.value ?? 0;
			return acc + (kcalories * value) / 100;
		}, 0);

		const uniqueDays = new Set(intervalEntries.map((e) => e.date).filter(Boolean));

		const dailyCaloriesPerInterval =
			uniqueDays.size > 0 ? totalCaloriesPerInterval / uniqueDays.size : 0;

		return Math.round(dailyCaloriesPerInterval);
	}, [from, to, foods]);
}
