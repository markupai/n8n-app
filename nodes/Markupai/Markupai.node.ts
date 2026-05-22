import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from "n8n-workflow";
import { MARKUPAI_API_CREDENTIAL_NAME } from "../../credentials/MarkupAiApi.credentials";
import { listAllAgents } from "./utils/agents.api.utils";
import { DOMAIN_IDS_AGENT_IDS, STYLE_OPTION_AGENT_IDS } from "./utils/agent.input.coverage";
import { createErrorResponse, getErrorDescription } from "./utils/error.helpers";
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
    subtitle: '={{$parameter["operation"] + ": " + $parameter["agents"]}}',
    icon: "file:markupai.svg",
    version: 1,
    usableAsTool: true,
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
            description: "Human-readable name of the document being analyzed",
          },
          {
            displayName: "Document Reference",
            name: "documentRef",
            type: "string",
            default: "",
            description:
              "Caller-supplied identifier (for example a CMS page ID) echoed back in the result for tracking",
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
      try {
        const result = await processMarkupaiItem.call(this, i, allAgents, showNumericScores);
        returnData.push(result);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push(createErrorResponse(error, i));
          continue;
        }
        // Preserve NodeApiError so the n8n UI keeps HTTP status, URL, and response body.
        if (error instanceof NodeApiError) {
          const apiError = error;
          throw apiError;
        }
        throw new NodeOperationError(
          this.getNode(),
          error instanceof Error ? error : new Error(String(error)),
          {
            description: getErrorDescription(error),
            itemIndex: i,
          },
        );
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
