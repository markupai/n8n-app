import { describe, expect, it } from "vitest";
import { getStringContentType } from "../../nodes/Markupai/utils/filename.resolver";

function getAndValidateDitaExtension(content: string) {
	getAndValidateFileNameExtension(content, ".dita");
}

function getAndValidateHtmlExtension(content: string) {
	getAndValidateFileNameExtension(content, ".html");
}

function getAndValidateMarkdownExtension(content: string) {
	getAndValidateFileNameExtension(content, ".md");
}

function getAndValidateFileNameExtension(content: string, expectedExtension: string) {
	const type = getStringContentType(content);
	expect(type).toBe(expectedExtension);
}

describe("getStringContentType (filename.resolver)", () => {
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
		getAndValidateDitaExtension(content);
	});

	it("does not misclassify non-DITA XML", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			"<note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don't forget me</body></note>";

		getAndValidateHtmlExtension(content);
	});

	it("detects HTML content", () => {
		const content =
			"<!doctype html>\n<html><head><title>x</title></head><body><div>Hi</div></body></html>";

		getAndValidateHtmlExtension(content);
	});

	it.each([
		{
			description: "basic content with heading, list, and link",
			content: "# Heading\n\n- item 1\n- item 2\n\n[link](https://example.com)",
		},
		{
			description: "frontmatter with YAML",
			content: "---\ntitle: My Document\nauthor: John Doe\n---\n\nContent here",
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
			description: "unordered list using * marker",
			content: "* item 1\n* item 2",
		},
		{
			description: "unordered list using + marker",
			content: "+ item 1\n+ item 2",
		},
		{
			description: "ordered list",
			content: "1. item 1\n2. item 2",
		},
		{
			description: "ordered list with multiple digits",
			content: "123. item 1\n456. item 2",
		},
		{
			description: "blockquote",
			content: "> This is a blockquote",
		},
		{
			description: "blockquote with multiple lines",
			content: "> Line 1\n> Line 2",
		},
		{
			description: "blockquote with leading whitespace",
			content: ">   Indented blockquote",
		},
		{
			description: "code fence with language identifier",
			content: "```javascript\nconst x = 1;\n```",
		},
		{
			description: "code fence without language",
			content: "```\ncode here\n```",
		},
		{
			description: "image with title",
			content: '![Alt text](image.png "Image title")',
		},
	])("detects Markdown with $description", ({ content }) => {
		getAndValidateMarkdownExtension(content);
	});

	it("falls back to text/plain for unknown content", () => {
		const content = "Just a plain line of text without special markers.";
		const type = getStringContentType(content);
		expect(type).toBe(".txt");
	});
});
