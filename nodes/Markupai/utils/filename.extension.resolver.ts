// Simple and fast heuristic to detect likely HTML content in a string
function isLikelyHtmlString(content: string): boolean {
	const sample = content.trimStart().slice(0, 256).toLowerCase();

	if (sample.startsWith("<!doctype html") || sample.startsWith("<html")) {
		return true;
	}

	// Common HTML tags early in documents
	return /<(head|body|title|div|span|p|h1|h2|h3|h4|h5|h6)\b/.test(sample);
}

// Heuristic to detect likely Markdown content in a string
function isLikelyMarkdownString(content: string): boolean {
	const sample = content.trimStart().slice(0, 512).toLowerCase();
	// Frontmatter
	if (/^---\n[\s\S]*?\n---\n/.test(sample)) {
		return true;
	}

	// Headings
	if (/^#{1,6}\s+.+/m.test(sample)) {
		return true;
	}

	// Unordered and ordered lists - split regex to avoid backtracking issues
	if (/^\s{0,100}[-*+]\s+\S/m.test(sample) || /^\s{0,100}\d{1,10}\.\s+\S/m.test(sample)) {
		return true;
	}

	// Links - use negated character classes with bounded quantifiers to prevent backtracking
	// Matches [text](url) or [text](url "title") format
	if (/\[[^\]]{0,200}]\([^)]{0,200}(\s+"[^"]{0,100}")?\)/i.test(sample)) {
		return true;
	}

	// Images - use negated character classes with bounded quantifiers to prevent backtracking
	// Matches ![alt](url) or ![alt](url "title") format
	if (/!\[[^\]]{0,200}]\([^)]{0,200}(\s+"[^"]{0,100}")?\)/i.test(sample)) {
		return true;
	}

	// Blockquotes - use bounded quantifier to prevent backtracking
	// Matches lines starting with > followed by content
	if (/^>\s*\S.*$/m.test(sample)) {
		return true;
	}

	// Code fences
	return /```[\s\S]{0,500}```/.test(sample);
}

// Heuristic to detect likely DITA XML content in a string
function isLikelyDitaString(content: string): boolean {
	const sample = content.trimStart().slice(0, 512).toLowerCase();
	// Common DITA root element names (topics and maps)
	const rootNames = "topic|concept|task|reference|map|bookmap|glossentry|subjectScheme";

	// DOCTYPE with DITA identifiers
	if (new RegExp(String.raw`<!DOCTYPE\s+(?:${rootNames})\b/.*/DITA`, "is").test(sample)) {
		return true;
	}

	// DOCTYPE declaration referencing a DTD file (any name) for known DITA root elements
	if (
		new RegExp(String.raw`<!DOCTYPE\s+(?:${rootNames})\b.*?["'][^"']*\.dtd["']`, "is").test(sample)
	) {
		return true;
	}

	// Root element check following optional XML declaration
	if (new RegExp(String.raw`^\s*<\?xml.{0,200}?\?>?\s*<(?:${rootNames})\b`, "ims").test(sample)) {
		return true;
	}

	// DITA class attribute hallmark (e.g., class="- topic/topic ")
	return /\bclass="[^"]*\btopic\/topic\b/i.test(sample);
}

// Helper function to determine extension for MIME type
export function getFileNameExtension(contentType: string): string {
	switch (contentType) {
		case "application/dita+xml":
			return ".dita";
		case "text/markdown":
			return ".md";
		case "text/html":
			return ".html";
		case "text/plain":
			return ".txt";
		default:
			return ".txt";
	}
}

export function getFileExtensionFromFileName(fileName: string): string {
	const arr = fileName.split(".");
	const extension = arr.length > 1 ? arr.pop() : "";

	return extension ? "." + extension : "";
}

export function getMimeTypeFromFileName(fileName: string): string {
	const extension = getFileExtensionFromFileName(fileName).toLowerCase();

	switch (extension) {
		case ".dita":
			return "application/dita+xml";
		case ".md":
		case ".markdown":
			return "text/markdown";
		case ".html":
		case ".htm":
			return "text/html";
		case ".txt":
			return "text/plain";
		default:
			return "text/plain";
	}
}

// Helper function to determine MIME type for string content
export function getContentType(content: string): string {
	if (isLikelyDitaString(content)) {
		return "application/dita+xml";
	}

	if (isLikelyMarkdownString(content)) {
		return "text/markdown";
	}

	if (isLikelyHtmlString(content)) {
		return "text/html";
	}

	return "text/plain";
}
