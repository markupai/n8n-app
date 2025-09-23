import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeExecutionData,
	INodePropertyTypeOptions,
} from 'n8n-workflow';
import { Markupai } from '../../nodes/Markupai/Markupai.node';
import { NodeApiError } from 'n8n-workflow';

vi.mock('n8n-workflow', async () => {
	const actual = await vi.importActual('n8n-workflow');
	return {
		...actual,
		NodeConnectionTypes: {
			Main: 'main',
		},
		NodeApiError: class NodeApiError extends Error {
			constructor(_: any, error: any) {
				super(error.message || 'Node API Error');
				this.name = 'NodeApiError';
			}
		},
	};
});

vi.mock('../../nodes/Markupai/utils/load.options', () => ({
	loadStyleGuides: vi.fn(),
	loadTones: vi.fn(),
	loadDialects: vi.fn(),
}));

vi.mock('../../nodes/Markupai/utils/style.api.utils', () => ({
	styleRequest: vi.fn(),
	getPath: vi.fn(),
}));

vi.mock('../../nodes/Markupai/utils/email.generator', () => ({
	generateEmailHTMLReport: vi.fn(),
}));

describe('Markupai', () => {
	let markupai: Markupai;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		markupai = new Markupai();

		mockExecuteFunctions = {
			getInputData: vi.fn(),
			getNodeParameter: vi.fn(),
			helpers: {
				createDeferredPromise: vi.fn(),
				returnJsonArray: vi.fn(),
			} as any,
			getNode: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(markupai.description.displayName).toBe('Markup AI');
			expect(markupai.description.name).toBe('markupai');
			expect(markupai.description.description).toBe('Markup AI Content Checker');
			expect(markupai.description.icon).toBe('file:markupai.svg');
			expect(markupai.description.version).toBe(1);
		});

		it('should have correct default name', () => {
			expect(markupai.description.defaults.name).toBe('Markup AI');
		});

		it('should have correct inputs and outputs', () => {
			expect(markupai.description.inputs).toHaveLength(1);
			expect(markupai.description.outputs).toHaveLength(1);
		});

		it('should have correct credentials configuration', () => {
			const credentials = markupai.description.credentials as INodeCredentialDescription[];

			expect(credentials).toHaveLength(1);
			expect(credentials[0].name).toBe('markupaiApi');
			expect(credentials[0].required).toBe(true);
		});

		it('should have correct properties structure', () => {
			const properties = markupai.description.properties;

			const resourceProp = properties.find((p) => p.name === 'resource');
			expect(resourceProp).toBeDefined();
			expect(resourceProp?.type).toBe('options');
			expect(resourceProp?.default).toBe('content');

			const operationProp = properties.find((p) => p.name === 'operation');
			expect(operationProp).toBeDefined();
			expect(operationProp?.type).toBe('options');
			expect(operationProp?.default).toBe('styleCheck');

			const contentProp = properties.find((p) => p.name === 'content');
			expect(contentProp).toBeDefined();
			expect(contentProp?.type).toBe('string');
			expect(contentProp?.required).toBe(true);

			const styleGuideProp = properties.find((p) => p.name === 'styleGuide');
			expect(styleGuideProp).toBeDefined();
			expect(styleGuideProp?.type).toBe('options');
			expect(styleGuideProp?.typeOptions?.loadOptionsMethod).toBe('loadStyleGuides');

			const toneProp = properties.find((p) => p.name === 'tone');
			expect(toneProp).toBeDefined();
			expect(toneProp?.type).toBe('options');
			expect(toneProp?.default).toBe('None (Keep Tone Unchanged)');
			expect(toneProp?.typeOptions?.loadOptionsMethod).toBe('loadTones');

			const dialectProp = properties.find((p) => p.name === 'dialect');
			expect(dialectProp).toBeDefined();
			expect(dialectProp?.type).toBe('options');
			expect(dialectProp?.typeOptions?.loadOptionsMethod).toBe('loadDialects');
		});

		it('should have correct additional options structure', () => {
			const additionalOptionsProp = markupai.description.properties.find(
				(p) => p.name === 'additionalOptions',
			);
			expect(additionalOptionsProp).toBeDefined();
			expect(additionalOptionsProp?.type).toBe('collection');

			const options = additionalOptionsProp?.options;
			expect(options).toBeDefined();

			const documentLinkOption = options?.find(
				(o) => o.name === 'documentLink',
			) as INodePropertyTypeOptions;
			expect(documentLinkOption).toBeDefined();
			expect(documentLinkOption?.type).toBe('string');

			const documentNameOption = options?.find(
				(o) => o.name === 'documentName',
			) as INodePropertyTypeOptions;
			expect(documentNameOption).toBeDefined();
			expect(documentNameOption?.type).toBe('string');

			const documentOwnerOption = options?.find(
				(o) => o.name === 'documentOwner',
			) as INodePropertyTypeOptions;
			expect(documentOwnerOption).toBeDefined();
			expect(documentOwnerOption?.type).toBe('string');

			const pollingTimeoutOption = options?.find(
				(o) => o.name === 'pollingTimeout',
			) as INodePropertyTypeOptions;
			expect(pollingTimeoutOption).toBeDefined();
			expect(pollingTimeoutOption?.type).toBe('number');
			expect(pollingTimeoutOption?.default).toBe(60000);

			const waitForCompletionOption = options?.find(
				(o) => o.name === 'waitForCompletion',
			) as INodePropertyTypeOptions;
			expect(waitForCompletionOption).toBeDefined();
			expect(waitForCompletionOption?.type).toBe('boolean');
			expect(waitForCompletionOption?.default).toBe(true);
		});
	});

	describe('Methods', () => {
		it('should have correct loadOptions methods', () => {
			expect(markupai.methods.loadOptions.loadStyleGuides).toBeDefined();
			expect(markupai.methods.loadOptions.loadTones).toBeDefined();
			expect(markupai.methods.loadOptions.loadDialects).toBeDefined();
		});
	});

	describe('Execute Method', () => {
		const mockInputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

		const mockStyleRequest = vi.fn();
		const mockGenerateEmailHTMLReport = vi.fn();
		const mockGetPath = vi.fn();

		beforeEach(async () => {
			const { styleRequest } = await import('../../nodes/Markupai/utils/style.api.utils');
			const { generateEmailHTMLReport } = await import(
				'../../nodes/Markupai/utils/email.generator'
			);
			const { getPath } = await import('../../nodes/Markupai/utils/style.api.utils');

			vi.mocked(styleRequest).mockImplementation(mockStyleRequest);
			vi.mocked(generateEmailHTMLReport).mockImplementation(mockGenerateEmailHTMLReport);
			vi.mocked(getPath).mockImplementation(mockGetPath);

			mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(mockInputData);

			if (mockExecuteFunctions.helpers) {
				mockExecuteFunctions.helpers.returnJsonArray = vi.fn().mockReturnValue(mockInputData);
			}
		});

		it('should execute styleCheck operation successfully with completion', async () => {
			const mockResult = {
				workflow: { id: 'test-id', status: 'completed' },
				config: { style_guide: { style_guide_id: 'test-guide' } },
				original: { issues: [], scores: { quality: { score: 85 } } },
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue('<html>test report</html>');
			mockGetPath.mockReturnValue('v1/style/checks');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({
					waitForCompletion: true,
					pollingTimeout: 30000,
					documentName: 'test.txt',
					documentOwner: 'test-owner',
					documentLink: 'https://test.com',
				});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				{
					content: 'test content',
					styleGuide: 'test-style-guide',
					tone: 'professional',
					dialect: 'american_english',
					waitForCompletion: true,
					pollingTimeout: 30000,
				},
				'v1/style/checks',
				0,
			);

			expect(mockGenerateEmailHTMLReport).toHaveBeenCalledWith(mockResult, {
				document_name: 'test.txt',
				document_owner: 'test-owner',
				document_link: 'https://test.com',
			});

			expect(result).toEqual([mockInputData]);
		});

		it('should execute styleRewrite operation successfully with completion', async () => {
			const mockResult = {
				workflow: { id: 'test-id', status: 'completed' },
				config: { style_guide: { style_guide_id: 'test-guide' } },
				original: { issues: [], scores: { quality: { score: 85 } } },
				rewrite: { text: 'rewritten content' },
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue('<html>test report</html>');
			mockGetPath.mockReturnValue('v1/style/rewrites');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleRewrite')
				.mockReturnValueOnce('test content')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({
					waitForCompletion: true,
				});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				{
					content: 'test content',
					styleGuide: 'test-style-guide',
					tone: 'professional',
					dialect: 'american_english',
					waitForCompletion: true,
					pollingTimeout: 60000, // default value
				},
				'v1/style/rewrites',
				0,
			);

			expect(result).toEqual([mockInputData]);
		});

		it('should handle "None (Keep Tone Unchanged)" tone correctly', async () => {
			const mockResult = {
				workflow: { id: 'test-id', status: 'completed' },
				config: { style_guide: { style_guide_id: 'test-guide' } },
				original: { issues: [], scores: { quality: { score: 85 } } },
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue('<html>test report</html>');
			mockGetPath.mockReturnValue('v1/style/checks');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('None (keep tone unchanged)')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({ waitForCompletion: true });

			await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.not.objectContaining({ tone: expect.any(String) }),
				'v1/style/checks',
				0,
			);
		});

		it('should execute without waiting for completion', async () => {
			const mockResult = {
				status: 'running',
				workflow_id: 'test-id',
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGetPath.mockReturnValue('v1/style/checks');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({
					waitForCompletion: false,
				});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					waitForCompletion: false,
				}),
				'v1/style/checks',
				0,
			);

			expect(mockGenerateEmailHTMLReport).not.toHaveBeenCalled();
			expect(result).toEqual([mockInputData]);
		});

		it('should handle multiple input items', async () => {
			const multipleInputData: INodeExecutionData[] = [
				{ json: { test: 'data1' } },
				{ json: { test: 'data2' } },
			];

			const mockResult = {
				workflow: { id: 'test-id', status: 'completed' },
				config: { style_guide: { style_guide_id: 'test-guide' } },
				original: { issues: [], scores: { quality: { score: 85 } } },
			};

			mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(multipleInputData);
			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue('<html>test report</html>');
			mockGetPath.mockReturnValue('v1/style/checks');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content 1')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({ waitForCompletion: true })
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content 2')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({ waitForCompletion: true });

			await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledTimes(2);
			expect(mockStyleRequest).toHaveBeenNthCalledWith(
				1,
				mockExecuteFunctions,
				expect.objectContaining({ content: 'test content 1' }),
				'v1/style/checks',
				0,
			);
			expect(mockStyleRequest).toHaveBeenNthCalledWith(
				2,
				mockExecuteFunctions,
				expect.objectContaining({ content: 'test content 2' }),
				'v1/style/checks',
				1,
			);
		});

		it('should throw NodeApiError when styleRequest fails', async () => {
			const error = new Error('API request failed');
			mockStyleRequest.mockRejectedValue(error);
			mockGetPath.mockReturnValue('v1/style/checks');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({ waitForCompletion: true });

			await expect(markupai.execute.call(mockExecuteFunctions as any)).rejects.toThrow(
				NodeApiError,
			);
		});

		it('should handle undefined additional options gracefully', async () => {
			const mockResult = {
				workflow: { id: 'test-id', status: 'completed' },
				config: { style_guide: { style_guide_id: 'test-guide' } },
				original: { issues: [], scores: { quality: { score: 85 } } },
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue('<html>test report</html>');
			mockGetPath.mockReturnValue('v1/style/checks');

			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce('styleCheck')
				.mockReturnValueOnce('test content')
				.mockReturnValueOnce('test-style-guide')
				.mockReturnValueOnce('professional')
				.mockReturnValueOnce('american_english')
				.mockReturnValueOnce({});

			await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.objectContaining({
					waitForCompletion: true, // default value when undefined
					pollingTimeout: 60000, // default value when undefined
				}),
				'v1/style/checks',
				0,
			);
		});
	});
});
