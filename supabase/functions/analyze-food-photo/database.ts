import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { EatenProductInsert, FoodAnalysis } from "./types.ts";

function normalizeDate(date?: string): string {
	const today = new Date().toLocaleDateString("sv-SE");
	return typeof date === "string" && date.trim().length > 0 ? date.trim() : today;
}

export function preparePendingEatenProductData(
	userId: string,
	imageUrl: string,
	date?: string,
): EatenProductInsert {
	return {
		name: "Продукт",
		unit: "г",
		date: normalizeDate(date),
		userId,
		imageUrl,
		status: "pending",
	};
}

export async function insertEatenProduct(
	supabaseClient: SupabaseClient,
	data: EatenProductInsert,
): Promise<{ id: number }> {
	const { data: insertedData, error } = await supabaseClient
		.from("eaten_products")
		.insert(data)
		.select("id")
		.single();

	if (error) {
		console.error("Database insert error:", error);
		throw new Error(`Failed to insert data: ${error.message}`);
	}

	if (!insertedData?.id) {
		throw new Error("Failed to insert data: missing inserted id");
	}

	return { id: insertedData.id };
}

export async function updateEatenProductAnalysis(
	supabaseClient: SupabaseClient,
	id: number,
	analysis: FoodAnalysis,
): Promise<void> {
	const updateData: Omit<Partial<EatenProductInsert>, "date" | "userId" | "imageUrl"> = {
		status: "completed",
		name: analysis.food_name || "Продукт",
	};

	if (typeof analysis.calories === "number") {
		updateData.kcalories = Math.round(analysis.calories);
	}
	if (typeof analysis.protein === "number") {
		updateData.protein = Math.round(analysis.protein);
	}
	if (typeof analysis.weight === "number") {
		updateData.value = Math.round(analysis.weight);
	}

	const { error } = await supabaseClient.from("eaten_products").update(updateData).eq("id", id);

	if (error) {
		console.error("Database update error:", error);
		throw new Error(`Failed to update data: ${error.message}`);
	}
}

export async function updateEatenProductStatus(
	supabaseClient: SupabaseClient,
	id: number,
	status: "pending" | "completed" | "error",
): Promise<void> {
	const { error } = await supabaseClient
		.from("eaten_products")
		.update({ status })
		.eq("id", id);

	if (error) {
		console.error("Database status update error:", error);
		throw new Error(`Failed to update status: ${error.message}`);
	}
}
