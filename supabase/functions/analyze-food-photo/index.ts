import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createErrorResponse, createPendingResponse } from "./responses.ts";
import { handleCorsPreflight } from "./cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "./auth.ts";
import { parseFormData, processFile } from "./file-handler.ts";
import { uploadImage, getPublicUrl } from "./storage.ts";
import { analyzeFoodImage } from "./llm.ts";
import { extractAnalysisFromResponse } from "./parser.ts";
import {
	preparePendingEatenProductData,
	insertEatenProduct,
	updateEatenProductAnalysis,
	updateEatenProductStatus,
} from "./database.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime:
	| {
			waitUntil: (promise: Promise<unknown>) => void;
	  }
	| undefined;

async function runBackgroundAnalysis(
	supabaseClient: SupabaseClient,
	insertedId: number,
	imageUrl: string,
): Promise<void> {
	try {
		const llmResponse = await analyzeFoodImage(imageUrl);
		const nutritionData = await extractAnalysisFromResponse(llmResponse);
		await updateEatenProductAnalysis(supabaseClient, insertedId, nutritionData);
	} catch (error) {
		console.error("Background analysis failed:", error);
		try {
			await updateEatenProductStatus(supabaseClient, insertedId, "error");
		} catch (statusError) {
			console.error("Failed to update status to error:", statusError);
		}
	}
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return handleCorsPreflight();
	}

	try {
		const supabaseClient = createSupabaseClient(req.headers.get("Authorization"));
		const { user, error: authError } = await getAuthenticatedUser(supabaseClient);

		if (authError || !user) {
			return createErrorResponse("Unauthorized", 401);
		}

		const { file, date } = await parseFormData(req);
		const fileInfo = await processFile(user.id, file);

		const uploadResult = await uploadImage(
			supabaseClient,
			fileInfo.fullPath,
			fileInfo.buffer,
			file.type,
		);

		if (uploadResult.error) {
			console.error("Upload error:", uploadResult.error);
			return createErrorResponse(uploadResult.error.message, 500);
		}

		const imageUrl = getPublicUrl(supabaseClient, fileInfo.fullPath);
		const pendingData = preparePendingEatenProductData(user.id, imageUrl, date);
		const { id: insertedId } = await insertEatenProduct(supabaseClient, pendingData);

		const backgroundTask = runBackgroundAnalysis(supabaseClient, insertedId, imageUrl);

		if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
			EdgeRuntime.waitUntil(backgroundTask);
		} else {
			void backgroundTask;
		}

		return createPendingResponse(insertedId, imageUrl);
	} catch (error) {
		console.error("analyze-food-photo failed:", error);
		return createErrorResponse(error instanceof Error ? error.message : "Internal server error", 500);
	}
});
