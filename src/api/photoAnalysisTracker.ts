const pendingAnalysisIds = new Set<number>();

export function trackPendingAnalysis(id: number): void {
	pendingAnalysisIds.add(id);
}

export function untrackPendingAnalysis(id: number): void {
	pendingAnalysisIds.delete(id);
}

export function isPendingAnalysis(id: number): boolean {
	return pendingAnalysisIds.has(id);
}
