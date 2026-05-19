import { describe, expect, it } from "vitest";
import {
  AGENT_ADDITIONAL_OPTION_FIELDS,
  AGENT_IDS,
} from "../../nodes/Markupai/utils/agent.input.coverage";

describe("agent.input.coverage", () => {
  it("maps every non-orchestrator agent from api.json to additional option fields", () => {
    expect(AGENT_ADDITIONAL_OPTION_FIELDS).toEqual({
      [AGENT_IDS.terminology]: ["documentName", "documentRef", "domainIds"],
      [AGENT_IDS.genericClaims]: ["documentName", "documentRef"],
      [AGENT_IDS.sourceAuthority]: ["documentName", "documentRef"],
      [AGENT_IDS.freshness]: ["documentName", "documentRef"],
      [AGENT_IDS.focusAgent]: ["documentName", "documentRef"],
      [AGENT_IDS.aiVoiceDetector]: ["documentName", "documentRef", "domainIds"],
      [AGENT_IDS.styleAgent]: ["documentName", "documentRef", "targetId"],
      [AGENT_IDS.snippetReadiness]: ["documentName", "documentRef"],
    });
  });
});
