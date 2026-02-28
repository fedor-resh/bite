export interface FileInfo {
	buffer: ArrayBuffer;
	fullPath: string;
}

export interface ParsedFormData {
	file: File;
	date?: string;
}

export async function parseFormData(req: Request): Promise<ParsedFormData> {
	const formData = await req.formData();
	const file = formData.get("photo") as File;
	const dateValue = formData.get("date");

	if (!file) {
		throw new Error("No photo provided");
	}

	return {
		file,
		date: typeof dateValue === "string" ? dateValue : undefined,
	};
}

export function generateFilePath(userId: string, file: File): string {
	const fileExt = file.name.split(".").pop() || "jpg";
	const fileName = `photo-${Date.now()}.${fileExt}`;
	return `${userId}/${fileName}`;
}

export async function processFile(userId: string, file: File): Promise<FileInfo> {
	const buffer = await file.arrayBuffer();
	const fullPath = generateFilePath(userId, file);

	return {
		buffer,
		fullPath,
	};
}
