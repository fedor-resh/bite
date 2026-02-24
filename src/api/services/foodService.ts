import { supabase } from "@/lib/supabase";
import type { EatenProduct } from "@/types/types";

export const foodService = {
	async getFoodInRange(userId: string, fromDate: string, toDate: string): Promise<EatenProduct[]> {
		const { data, error } = await supabase
			.from("eaten_products")
			.select("*")
			.eq("userId", userId)
			.gte("date", fromDate)
			.lte("date", toDate)
			.order("createdAt", { ascending: false });

		if (error) {
			throw error;
		}

		return data as EatenProduct[];
	},
};
