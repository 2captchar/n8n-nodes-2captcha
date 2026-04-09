import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IHttpRequestOptions,
    NodeOperationError,
} from 'n8n-workflow';
import { setTimeout as sleep } from 'timers/promises';

export class TwoCaptcha implements INodeType {
    description: INodeTypeDescription = {
        displayName: '2Captcha',
        name: 'twoCaptcha',
        icon: 'file:2captcha.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Bypass captchas natively using 2Captcha API',
        defaults: {
            name: '2Captcha',
        },
        usableAsTool: true,
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'twoCaptchaApi',
                required: true,
            },
        ],
        properties: [
            // Ресурс (Исправляет предупреждение линтера о группировке)
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Captcha',
                        value: 'captcha',
                    },
                ],
                default: 'captcha',
            },
            // Тип капчи (Алфавитный порядок и строгий Title Case)
            {
                displayName: 'Captcha Type',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['captcha'],
                    },
                },
                options: [
                    { name: 'Cloudflare Turnstile', value: 'turnstile' },
                    { name: 'HCaptcha', value: 'hcaptcha' },
                    { name: 'Normal (Image To Text)', value: 'normal' },
                    { name: 'ReCAPTCHA Enterprise', value: 'recaptchaEnterprise' },
                    { name: 'ReCAPTCHA V2', value: 'recaptchaV2' },
                    { name: 'ReCAPTCHA V3', value: 'recaptchaV3' },
                ],
                default: 'turnstile',
            },
            {
                displayName: 'Page URL',
                name: 'url',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        resource: ['captcha'],
                        operation: [
                            'turnstile', 'recaptchaV2', 'recaptchaV3', 'recaptchaEnterprise', 'hcaptcha'
                        ],
                    },
                },
                description: 'Full URL of the page where the captcha is located',
            },
            {
                displayName: 'Site Key / App ID',
                name: 'sitekey',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        resource: ['captcha'],
                        operation: [
                            'turnstile', 'recaptchaV2', 'recaptchaV3', 'recaptchaEnterprise', 'hcaptcha'
                        ],
                    },
                },
                description: 'The sitekey, googlekey, or App ID found in the HTML code',
            },
            {
                displayName: 'Action',
                name: 'action',
                type: 'string',
                default: 'verify',
                displayOptions: {
                    show: { 
                        resource: ['captcha'],
                        operation: ['recaptchaV3', 'recaptchaEnterprise'] 
                    },
                },
            },
            {
                displayName: 'Min Score',
                name: 'minScore',
                type: 'number',
                default: 0.3,
                displayOptions: {
                    show: { 
                        resource: ['captcha'],
                        operation: ['recaptchaV3'] 
                    },
                },
            },
            {
                displayName: 'Image (Base64)',
                name: 'base64',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { 
                        resource: ['captcha'],
                        operation: ['normal'] 
                    },
                },
                description: 'Base64 encoded string of the captcha image',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        
        for (let i = 0; i < items.length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i) as string;
                let taskPayload: Record<string, unknown> = {};

                const url = this.getNodeParameter('url', i, '') as string;
                const sitekey = this.getNodeParameter('sitekey', i, '') as string;

                switch (operation) {
                    case 'turnstile':
                        taskPayload = { type: 'TurnstileTaskProxyless', websiteURL: url, websiteKey: sitekey };
                        break;
                    case 'recaptchaV2':
                        taskPayload = { type: 'RecaptchaV2TaskProxyless', websiteURL: url, websiteKey: sitekey };
                        break;
                    case 'recaptchaV3':
                        taskPayload = { 
                            type: 'RecaptchaV3TaskProxyless', 
                            websiteURL: url, 
                            websiteKey: sitekey, 
                            pageAction: this.getNodeParameter('action', i) as string,
                            minScore: this.getNodeParameter('minScore', i) as number
                        };
                        break;
                    case 'recaptchaEnterprise':
                        taskPayload = { 
                            type: 'RecaptchaV2EnterpriseTaskProxyless', 
                            websiteURL: url, 
                            websiteKey: sitekey, 
                            enterprisePayload: { s: this.getNodeParameter('action', i) as string }
                        };
                        break;
                    case 'hcaptcha':
                        taskPayload = { type: 'HCaptchaTaskProxyless', websiteURL: url, websiteKey: sitekey };
                        break;
                    case 'normal':
                        taskPayload = { 
                            type: 'ImageToTextTask', 
                            body: this.getNodeParameter('base64', i) as string 
                        };
                        break;
                    default:
                        throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, { itemIndex: i });
                }

                const createOptions: IHttpRequestOptions = {
                    method: 'POST',
                    url: 'https://api.2captcha.com/createTask',
                    body: {
                        task: taskPayload,
                    },
                    json: true,
                };

                // n8n сам добавит clientKey в тело запроса
                const createResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'twoCaptchaApi', createOptions);

                if (createResponse.errorId !== 0) {
                    throw new NodeOperationError(this.getNode(), `2Captcha Error: ${createResponse.errorDescription || 'Unknown error'}`, { itemIndex: i });
                }

                const taskId = createResponse.taskId;
                let finalToken: string | null = null;
                
                for (let attempt = 0; attempt < 24; attempt++) {
                    await sleep(5000);

                    const resultOptions: IHttpRequestOptions = {
                        method: 'POST',
                        url: 'https://api.2captcha.com/getTaskResult',
                        body: {
                            taskId: taskId,
                        },
                        json: true,
                    };

                    const resultResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'twoCaptchaApi', resultOptions);

                    if (resultResponse.status === 'ready') {
                        const solution = resultResponse.solution;
                        finalToken = solution.gRecaptchaResponse || solution.token || solution.text || solution;
                        break;
                    }
                }

                if (!finalToken) {
                    throw new NodeOperationError(this.getNode(), 'Task timeout: Captcha was not solved within 2 minutes.', { itemIndex: i });
                }

                returnData.push({
                    json: {
                        success: true,
                        taskId: taskId,
                        token: finalToken,
                        type: operation
                    },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message } });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}