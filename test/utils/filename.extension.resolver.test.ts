import { describe, expect, it } from "vitest";
import {
	getContentType,
	getFileExtensionFromFileName,
	getFileNameExtension,
	getMimeTypeFromFileName,
} from "../../nodes/Markupai/utils/filename.extension.resolver";

function getAndValidateFileNameExtension(contentType: string, expectedExtension: string) {
	const type = getFileNameExtension(contentType);

	expect(type).toBe(expectedExtension);
}

function getAndValidateHtmlContentType(content: string) {
	getAndValidateContentType(content, "text/html");
}

function getAndValidateDitaContentType(content: string) {
	getAndValidateContentType(content, "application/dita+xml");
}

function getAndValidateMarkdownContentType(content: string) {
	getAndValidateContentType(content, "text/markdown");
}

function getAndValidateTextContentType(content: string) {
	getAndValidateContentType(content, "text/plain");
}

function getAndValidateContentType(content: string, expectedContentType: string) {
	const type = getContentType(content);

	expect(type).toBe(expectedContentType);
}

describe("getFileNameExtension (filename.resolver)", () => {
	it.each([
		{
			description: "DOCTYPE PUBLIC identifier",
			content:
				"<?xml version='1.0' encoding='UTF-8'?>\n" +
				"<!DOCTYPE topic PUBLIC '-//OASIS//DTD DITA Topic//EN' 'topic.dtd'>\n" +
				'<topic id="t1"><title>Sample</title><body><p>Para</p></body></topic>',
		},
		{
			description: "DOCTYPE with arbitrary .dtd filename for DITA root",
			content:
				"<?xml version='1.0' encoding='UTF-8'?>\n" +
				"<!DOCTYPE task PUBLIC '-//OASIS//DTD DITA Task//EN' 'my-custom-dita-file-123.dtd'>\n" +
				'<task id="t1"><title>Task</title><taskbody><steps><step><cmd>Do</cmd></step></steps></taskbody></task>',
		},
		{
			description: "root map with DITA namespace",
			content:
				'<?xml version="1.0" encoding="UTF-8"?>\n' +
				'<map xmlns="http://dita.oasis-open.org/architecture/2005/">\n' +
				'  <topicref href="topic.dita"/>\n' +
				"</map>",
		},
		{
			description: "DOCTYPE SYSTEM URL to OASIS DITA DTD",
			content:
				'<?xml version="1.0" encoding="UTF-8"?>\n' +
				'<!DOCTYPE concept SYSTEM "https://docs.oasis-open.org/dita/v1.3/os/dtd/concept.dtd">\n' +
				'<concept id="c1"><title>Concept</title><conbody><p>Body</p></conbody></concept>',
		},
	])("detects DITA via $description", ({ content }) => {
		getAndValidateDitaContentType(content);
	});

	it("does not misclassify non-DITA XML", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			"<note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don't forget me</body></note>";

		getAndValidateHtmlContentType(content);
	});

	it("detects HTML content", () => {
		const content =
			"<!doctype html>\n<html><head><title>x</title></head><body><div>Hi</div></body></html>";

		getAndValidateHtmlContentType(content);
	});

	it.each([
		{
			description: "basic content with heading, list, and link",
			content: "# Heading\n\n- item 1\n- item 2\n\n[link](https://example.com)",
		},
		{
			description: "frontmatter with simple key-value pairs",
			content: "---\nkey: value\n---\n",
		},
		{
			description: "unordered list using - marker",
			content: "- item 1\n- item 2",
		},
		{
			description: "ordered list with multiple digits",
			content: "123. item 1\n456. item 2",
		},
		{
			description: "blockquote with multiple lines",
			content: "> Line 1\n> Line 2",
		},
		{
			description: "code fence with language identifier",
			content: "```javascript\nconst x = 1;\n```",
		},
		{
			description: "image with title",
			content: '![Alt text](image.png "Image title")',
		},
	])("detects Markdown with $description", ({ content }) => {
		getAndValidateMarkdownContentType(content);
	});

	it("falls back to text/plain for unknown content", () => {
		const content = "Just a plain line of text without special markers.";
		getAndValidateTextContentType(content);
	});
});

describe("getContentType (filename.extension.resolver)", () => {
	it.each([
		{
			description: "DITA content",
			contentType: "application/dita+xml",
			extension: ".dita",
		},
		{
			description: "Markdown content",
			contentType: "text/markdown",
			extension: ".md",
		},
		{
			description: "HTML content",
			contentType: "text/html",
			extension: ".html",
		},
		{
			description: "Plain text content",
			contentType: "text/plain",
			extension: ".txt",
		},
	])("detects content type with $description", ({ contentType, extension }) => {
		getAndValidateFileNameExtension(contentType, extension);
	});
});

describe("getMimeTypeFromFileName (filename.extension.resolver)", () => {
	it.each([
		{
			description: ".dita extension",
			fileName: "document.dita",
			expectedMimeType: "application/dita+xml",
		},
		{
			description: ".md extension",
			fileName: "readme.md",
			expectedMimeType: "text/markdown",
		},
		{
			description: ".markdown extension",
			fileName: "document.markdown",
			expectedMimeType: "text/markdown",
		},
		{
			description: ".html extension",
			fileName: "index.html",
			expectedMimeType: "text/html",
		},
		{
			description: ".htm extension",
			fileName: "page.htm",
			expectedMimeType: "text/html",
		},
		{
			description: ".txt extension",
			fileName: "notes.txt",
			expectedMimeType: "text/plain",
		},
	])("returns correct MIME type for $description", ({ fileName, expectedMimeType }) => {
		const mimeType = getMimeTypeFromFileName(fileName);

		expect(mimeType).toBe(expectedMimeType);
	});
});

describe("getFileExtensionFromFileName (filename.extension.resolver)", () => {
	it.each([
		{
			description: ".txt extension",
			fileName: "document.txt",
			expectedExtension: ".txt",
		},
		{
			description: ".md extension",
			fileName: "readme.md",
			expectedExtension: ".md",
		},
		{
			description: ".html extension",
			fileName: "index.html",
			expectedExtension: ".html",
		},
		{
			description: ".dita extension",
			fileName: "topic.dita",
			expectedExtension: ".dita",
		},
		{
			description: ".json extension",
			fileName: "config.json",
			expectedExtension: ".json",
		},
		{
			description: ".js extension",
			fileName: "script.js",
			expectedExtension: ".js",
		},
	])("returns correct extension for $description", ({ fileName, expectedExtension }) => {
		const extension = getFileExtensionFromFileName(fileName);

		expect(extension).toBe(expectedExtension);
	});

	it.each([
		{
			description: "file with multiple dots",
			fileName: "my.document.html",
			expectedExtension: ".html",
		},
		{
			description: "file with many dots",
			fileName: "archive.2024.01.01.txt",
			expectedExtension: ".txt",
		},
		{
			description: "file with version number",
			fileName: "app.v1.2.3.js",
			expectedExtension: ".js",
		},
	])("correctly extracts extension from $description", ({ fileName, expectedExtension }) => {
		const extension = getFileExtensionFromFileName(fileName);

		expect(extension).toBe(expectedExtension);
	});

	it.each([
		{
			description: "file with no extension",
			fileName: "readme",
			expectedExtension: "",
		},
		{
			description: "empty filename",
			fileName: "",
			expectedExtension: "",
		},
		{
			description: "file ending with dot",
			fileName: "file.",
			expectedExtension: "",
		},
	])("handles $description", ({ fileName, expectedExtension }) => {
		const extension = getFileExtensionFromFileName(fileName);

		expect(extension).toBe(expectedExtension);
	});

	it.each([
		{
			description: "file with path separators",
			fileName: "path/to/file.md",
			expectedExtension: ".md",
		},
		{
			description: "file with Windows path",
			fileName: String.raw`C:\Users\file.txt`,
			expectedExtension: ".txt",
		},
		{
			description: "file with nested path",
			fileName: "src/utils/helper.js",
			expectedExtension: ".js",
		},
	])("handles $description correctly", ({ fileName, expectedExtension }) => {
		const extension = getFileExtensionFromFileName(fileName);

		expect(extension).toBe(expectedExtension);
	});
});
