import { describe, expect, it } from "vitest";
import {
  AGENT_ADDITIONAL_OPTION_FIELDS,
  AGENT_IDS,
} from "../../nodes/Markupai/utils/agent.input.coverage";

describe("agent.input.coverage", () => {
  it("maps every non-orchestrator agent from api.json to additional option fields", () => {
    expect(AGENT_ADDITIONAL_OPTION_FIELDS).toEqual({
      [AGENT_IDS.terminology]: ["documentName", "documentLink", "domainIds"],
      [AGENT_IDS.genericClaims]: ["documentName", "documentLink"],
      [AGENT_IDS.sourceAuthority]: ["documentName", "documentLink"],
      [AGENT_IDS.freshness]: ["documentName", "documentLink"],
      [AGENT_IDS.focusAgent]: ["documentName", "documentLink"],
      [AGENT_IDS.aiVoiceDetector]: ["documentName", "documentLink", "domainIds"],
      [AGENT_IDS.styleAgent]: [
        "documentName",
        "documentLink",
        "orgName",
        "targetId",
        "contentProfileId",
      ],
      [AGENT_IDS.snippetReadiness]: ["documentName", "documentLink"],
    });
  });
});
