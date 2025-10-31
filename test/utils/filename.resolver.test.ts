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
	it("detects DITA via DOCTYPE PUBLIC identifier", () => {
		const content =
			"<?xml version='1.0' encoding='UTF-8'?>\n" +
			"<!DOCTYPE topic PUBLIC '-//OASIS//DTD DITA Topic//EN' 'topic.dtd'>\n" +
			'<topic id="t1"><title>Sample</title><body><p>Para</p></body></topic>';

		getAndValidateDitaExtension(content);
	});

	it("detects DITA via DOCTYPE with arbitrary .dtd filename for DITA root", () => {
		const content =
			"<?xml version='1.0' encoding='UTF-8'?>\n" +
			"<!DOCTYPE task PUBLIC '-//OASIS//DTD DITA Task//EN' 'my-custom-dita-file-123.dtd'>\n" +
			'<task id="t1"><title>Task</title><taskbody><steps><step><cmd>Do</cmd></step></steps></taskbody></task>';

		getAndValidateDitaExtension(content);
	});

	it("detects DITA via root map with DITA namespace", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<map xmlns="http://dita.oasis-open.org/architecture/2005/">\n' +
			'  <topicref href="topic.dita"/>\n' +
			"</map>";

		getAndValidateDitaExtension(content);
	});

	it("detects DITA via DOCTYPE SYSTEM URL to OASIS DITA DTD", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<!DOCTYPE concept SYSTEM "https://docs.oasis-open.org/dita/v1.3/os/dtd/concept.dtd">\n' +
			'<concept id="c1"><title>Concept</title><conbody><p>Body</p></conbody></concept>';

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

	it("detects Markdown content", () => {
		const content = "# Heading\n\n- item 1\n- item 2\n\n[link](https://example.com)";

		getAndValidateMarkdownExtension(content);
	});

	it("detects Markdown with unordered list using - marker", () => {
		const content = "- item 1\n- item 2";

		getAndValidateMarkdownExtension(content);
	});

	it("detects Markdown with unordered list using * marker", () => {
		const content = "* item 1\n* item 2";

		getAndValidateMarkdownExtension(content);
	});

	it("detects Markdown with unordered list using + marker", () => {
		const content = "+ item 1\n+ item 2";

		getAndValidateMarkdownExtension(content);
	});

	it("detects Markdown with ordered list", () => {
		const content = "1. item 1\n2. item 2";

		getAndValidateMarkdownExtension(content);
	});

	it("detects Markdown with ordered list with multiple digits", () => {
		const content = "123. item 1\n456. item 2";

		getAndValidateMarkdownExtension(content);
	});

	it("detects Markdown list with leading whitespace", () => {
		const content = "   - item 1\n   * item 2\n   1. item 3";

		getAndValidateMarkdownExtension(content);
	});

	it("falls back to text/plain for unknown content", () => {
		const content = "Just a plain line of text without special markers.";
		const type = getStringContentType(content);
		expect(type).toBe(".txt");
	});
});
