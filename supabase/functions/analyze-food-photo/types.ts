export interface FoodAnalysis {
	food_name: string;
	calories?: number;
	protein?: number;
	weight?: number;
	confidence: "low" | "medium" | "high";
	raw_response?: string;
}

export type AnalysisStatus = "pending" | "completed" | "error";

export interface EatenProductInsert {
	name: string;
	unit: string;
	date: string;
	userId: string;
	imageUrl: string;
	status: AnalysisStatus;
	kcalories?: number;
	protein?: number;
	value?: number;
}

export interface PendingAnalysisResponse {
	id: number;
	status: "pending";
	imageUrl: string;
}

export interface ErrorResponse {
	error: string;
	id?: number;
	imageUrl?: string;
	status?: AnalysisStatus;
}
