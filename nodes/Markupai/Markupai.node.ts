import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionTypes,
} from "n8n-workflow";
import { MARKUPAI_API_CREDENTIAL_NAME } from "../../credentials/MarkupAiApi.credentials";
import { listAllAgents } from "./utils/agents.api.utils";
import { DOMAIN_IDS_AGENT_IDS, STYLE_OPTION_AGENT_IDS } from "./utils/agent.input.coverage";
import { loadAgents, loadStyleAgentTargets, loadTerminologyDomains } from "./utils/load.options";
import { processMarkupaiItem } from "./utils/process.item";
import { assertStyleAgentEnabled, getStyleAgentConfig } from "./utils/style_agent_api";

const LOAD_AGENTS = "loadAgents" as const;
const LOAD_TERMINOLOGY_DOMAINS = "loadTerminologyDomains" as const;
const LOAD_STYLE_AGENT_TARGETS = "loadStyleAgentTargets" as const;

export class Markupai implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Markup AI",
    name: "markupai",
    description: "Run Markup AI agents for content analysis",
    icon: "file:markupai.svg",
    version: 1,
    defaults: {
      name: "Markup AI",
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    group: [],
    credentials: [
      {
        name: MARKUPAI_API_CREDENTIAL_NAME,
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Agent",
            value: "agent",
          },
        ],
        default: "agent",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["agent"],
          },
        },
        options: [
          {
            name: "Run Agent",
            value: "runAgent",
            action: "Run an agent",
            description: "Run an agent on the given text",
          },
        ],
        default: "runAgent",
      },
      {
        displayName: "Agent",
        name: "agents",
        type: "options",
        noDataExpression: true,
        required: true,
        description: "Select one agent to run",
        options: [],
        default: "",
        typeOptions: {
          loadOptionsMethod: LOAD_AGENTS,
        },
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
          },
        },
      },
      {
        displayName: "Domain IDs",
        name: "domainIds",
        type: "multiOptions",
        options: [],
        default: [],
        description: "Terminology domain IDs",
        typeOptions: {
          loadOptionsMethod: LOAD_TERMINOLOGY_DOMAINS,
        },
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
            agents: DOMAIN_IDS_AGENT_IDS,
          },
        },
      },
      {
        displayName: "Org Name",
        name: "orgName",
        type: "string",
        default: "",
        description: "Organization name injected from context for style checks",
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
            agents: STYLE_OPTION_AGENT_IDS,
          },
        },
      },
      {
        displayName: "Target",
        name: "targetId",
        type: "options",
        options: [],
        default: "",
        description:
          "Configured style agent target. Content profile is auto-detected by Markup AI.",
        typeOptions: {
          loadOptionsMethod: LOAD_STYLE_AGENT_TARGETS,
        },
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
            agents: STYLE_OPTION_AGENT_IDS,
          },
        },
      },
      {
        displayName: "Content Profile ID",
        name: "contentProfileId",
        type: "string",
        default: "",
        description: "Language-service content profile ID for style checks",
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
            agents: STYLE_OPTION_AGENT_IDS,
          },
        },
      },
      {
        displayName: "Content",
        name: "content",
        type: "string",
        typeOptions: {
          rows: 10,
        },
        required: true,
        default: "",
        description: "Document content to analyze",
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
          },
        },
      },
      {
        displayName: "Additional Options",
        name: "additionalOptions",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["runAgent"],
          },
        },
        options: [
          {
            displayName: "Document Name",
            name: "documentName",
            type: "string",
            default: "",
            description: "Name of the document being analyzed",
          },
          {
            displayName: "Document URL",
            name: "documentLink",
            type: "string",
            default: "",
            description: "URL or link to the source document",
          },
          {
            displayName: "Timeout (Ms)",
            name: "timeout",
            type: "number",
            default: 120_000,
            description: "Maximum time to wait for workflow completion when polling (milliseconds)",
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      [LOAD_AGENTS]: loadAgents,
      [LOAD_TERMINOLOGY_DOMAINS]: loadTerminologyDomains,
      [LOAD_STYLE_AGENT_TARGETS]: loadStyleAgentTargets,
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const styleAgentConfig = await getStyleAgentConfig.call(this);
    assertStyleAgentEnabled(styleAgentConfig);
    const showNumericScores = styleAgentConfig.style_agent_numeric_scoring;

    const allAgents = await listAllAgents.call(this);

    for (let i = 0; i < items.length; i++) {
      const result = await processMarkupaiItem.call(this, i, allAgents, showNumericScores);
      returnData.push(result);
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
