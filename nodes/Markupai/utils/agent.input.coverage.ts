export const AGENT_IDS = {
  terminology: "ag_WUijxT0DthMg",
  genericClaims: "ag_xQGQvFQMsspF",
  sourceAuthority: "ag_6074MH10KLx_",
  freshness: "ag_yufGdGvwNOKS",
  focusAgent: "ag_b_HbJuQ1r8rp",
  aiVoiceDetector: "ag_uagJSreavNwq",
  styleAgent: "ag_vYCPHsSQnnJj",
  snippetReadiness: "ag_5yM0oN4rStVx",
} as const;

export type AdditionalOptionField =
  | "documentName"
  | "documentLink"
  | "domainIds"
  | "orgName"
  | "targetId"
  | "contentProfileId";

export const COMMON_OPTION_FIELDS = ["documentName", "documentLink"] as const;

/**
 * Explicit map of non-orchestrator agent input coverage from api.json.
 * text is always required and represented by the top-level Text field, so this map only tracks Additional Options.
 */
export const AGENT_ADDITIONAL_OPTION_FIELDS: Readonly<
  Record<string, readonly AdditionalOptionField[]>
> = {
  [AGENT_IDS.terminology]: [...COMMON_OPTION_FIELDS, "domainIds"],
  [AGENT_IDS.genericClaims]: [...COMMON_OPTION_FIELDS],
  [AGENT_IDS.sourceAuthority]: [...COMMON_OPTION_FIELDS],
  [AGENT_IDS.freshness]: [...COMMON_OPTION_FIELDS],
  [AGENT_IDS.focusAgent]: [...COMMON_OPTION_FIELDS],
  [AGENT_IDS.aiVoiceDetector]: [...COMMON_OPTION_FIELDS, "domainIds"],
  [AGENT_IDS.styleAgent]: [...COMMON_OPTION_FIELDS, "orgName", "targetId", "contentProfileId"],
  [AGENT_IDS.snippetReadiness]: [...COMMON_OPTION_FIELDS],
};

export const DOMAIN_IDS_AGENT_IDS = Object.entries(AGENT_ADDITIONAL_OPTION_FIELDS)
  .filter(([, fields]) => fields.includes("domainIds"))
  .map(([agentId]) => agentId);

export const STYLE_OPTION_AGENT_IDS = Object.entries(AGENT_ADDITIONAL_OPTION_FIELDS)
  .filter(([, fields]) =>
    fields.some((field) => ["orgName", "targetId", "contentProfileId"].includes(field)),
  )
  .map(([agentId]) => agentId);
