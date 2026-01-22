// Query Keys
export const foodKeys = {
	all: ["foods"] as const,

	weeklyFoods: (monday: string) => ["foods", monday] as const,

	products: (query: string) => ["products", query] as const,
	foodsInRange: (from: string | null, to: string | null) => ["foods", "range", from, to] as const,
};
