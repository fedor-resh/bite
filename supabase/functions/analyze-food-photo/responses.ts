import { createCorsResponse } from "./cors.ts";
import type { ErrorResponse, PendingAnalysisResponse } from "./types.ts";

export function createPendingResponse(id: number, imageUrl: string): Response {
	const response: PendingAnalysisResponse = {
		id,
		status: "pending",
		imageUrl,
	};
	return createCorsResponse(JSON.stringify(response), 200);
}

export function createErrorResponse(
	error: string,
	status = 500,
	id?: number,
	imageUrl?: string,
): Response {
	const response: ErrorResponse = { error, status: "error" };
	if (id) response.id = id;
	if (imageUrl) response.imageUrl = imageUrl;
	return createCorsResponse(JSON.stringify(response), status);
}

export function createUnauthorizedResponse(): Response {
	return createErrorResponse("Unauthorized", 401);
}
