import { describe, expect, it } from "vitest";
import { getStringContentType } from "../../nodes/Markupai/utils/filename.resolver";

describe("getStringContentType (filename.resolver)", () => {
	it("detects DITA via DOCTYPE PUBLIC identifier", () => {
		const content =
			"<?xml version='1.0' encoding='UTF-8'?>\n" +
			"<!DOCTYPE topic PUBLIC '-//OASIS//DTD DITA Topic//EN' 'topic.dtd'>\n" +
			'<topic id="t1"><title>Sample</title><body><p>Para</p></body></topic>';
		const type = getStringContentType(content);
		expect(type).toBe(".dita");
	});

	it("detects DITA via DOCTYPE with arbitrary .dtd filename for DITA root", () => {
		const content =
			"<?xml version='1.0' encoding='UTF-8'?>\n" +
			"<!DOCTYPE task PUBLIC '-//OASIS//DTD DITA Task//EN' 'my-custom-dita-file-123.dtd'>\n" +
			'<task id="t1"><title>Task</title><taskbody><steps><step><cmd>Do</cmd></step></steps></taskbody></task>';
		const type = getStringContentType(content);
		expect(type).toBe(".dita");
	});

	it("detects DITA via root map with DITA namespace", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<map xmlns="http://dita.oasis-open.org/architecture/2005/">\n' +
			'  <topicref href="topic.dita"/>\n' +
			"</map>";
		const type = getStringContentType(content);
		expect(type).toBe(".dita");
	});

	it("detects DITA via DOCTYPE SYSTEM URL to OASIS DITA DTD", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<!DOCTYPE concept SYSTEM "https://docs.oasis-open.org/dita/v1.3/os/dtd/concept.dtd">\n' +
			'<concept id="c1"><title>Concept</title><conbody><p>Body</p></conbody></concept>';
		const type = getStringContentType(content);
		expect(type).toBe(".dita");
	});

	it("does not misclassify non-DITA XML", () => {
		const content =
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			"<note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don't forget me</body></note>";
		const type = getStringContentType(content);
		expect(type).toBe(".html");
	});

	it("detects HTML content", () => {
		const content =
			"<!doctype html>\n<html><head><title>x</title></head><body><div>Hi</div></body></html>";
		const type = getStringContentType(content);
		expect(type).toBe(".html");
	});

	it("detects Markdown content", () => {
		const content = "# Heading\n\n- item 1\n- item 2\n\n[link](https://example.com)";
		const type = getStringContentType(content);
		expect(type).toBe(".md");
	});

	it("falls back to text/plain for unknown content", () => {
		const content = "Just a plain line of text without special markers.";
		const type = getStringContentType(content);
		expect(type).toBe(".txt");
	});
});
