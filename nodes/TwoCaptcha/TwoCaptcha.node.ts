import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IHttpRequestOptions,
} from 'n8n-workflow';

// Функция-помощник для создания паузы между запросами
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'twoCaptchaApi',
                required: true,
            },
        ],
        properties: [
            // ==========================================
            // 1. ВЫБОР ТИПА КАПЧИ (OPERATION)
            // ==========================================
            {
                displayName: 'Captcha Type',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    { name: 'Cloudflare Turnstile', value: 'turnstile' },
                    { name: 'ReCAPTCHA v2', value: 'recaptchaV2' },
                    { name: 'ReCAPTCHA v3', value: 'recaptchaV3' },
                    { name: 'ReCAPTCHA Enterprise', value: 'recaptchaEnterprise' },
                    { name: 'hCaptcha', value: 'hcaptcha' },
                    { name: 'Normal (Image to Text)', value: 'normal' },
                ],
                default: 'turnstile',
            },
            
            // ==========================================
            // 2. БАЗОВЫЕ ПОЛЯ
            // ==========================================
            {
                displayName: 'Page URL',
                name: 'url',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
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
                        operation: [
                            'turnstile', 'recaptchaV2', 'recaptchaV3', 'recaptchaEnterprise', 'hcaptcha'
                        ],
                    },
                },
                description: 'The sitekey, googlekey, or App ID found in the HTML code',
            },

            // ==========================================
            // 3. ПОЛЯ ДЛЯ RECAPTCHA V3
            // ==========================================
            {
                displayName: 'Action',
                name: 'action',
                type: 'string',
                default: 'verify',
                displayOptions: {
                    show: { operation: ['recaptchaV3', 'recaptchaEnterprise'] },
                },
            },
            {
                displayName: 'Min Score',
                name: 'minScore',
                type: 'number',
                default: 0.3,
                displayOptions: {
                    show: { operation: ['recaptchaV3'] },
                },
            },

            // ==========================================
            // 4. ОБЫЧНАЯ КАРТИНКА
            // ==========================================
            {
                displayName: 'Image (Base64)',
                name: 'base64',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['normal'] },
                },
                description: 'Base64 encoded string of the captcha image',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        
        const credentials = await this.getCredentials('twoCaptchaApi');
        if (!credentials || !credentials.apiKey) {
            throw new Error('No API key provided!');
        }
        
        const clientKey = credentials.apiKey as string;

        for (let i = 0; i < items.length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i) as string;
                let taskPayload: any = {};

                const url = this.getNodeParameter('url', i, '') as string;
                const sitekey = this.getNodeParameter('sitekey', i, '') as string;

                // 1. Формируем сырой JSON для API 2Captcha
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
                        throw new Error(`Unsupported operation: ${operation}`);
                }

                // 2. Отправляем задачу на решение (createTask) через встроенный HTTP n8n
                const createOptions: IHttpRequestOptions = {
                    method: 'POST',
                    url: 'https://api.2captcha.com/createTask',
                    body: {
                        clientKey: clientKey,
                        task: taskPayload,
                    },
                    json: true,
                };

                const createResponse = await this.helpers.httpRequest(createOptions);

                if (createResponse.errorId !== 0) {
                    throw new Error(`2Captcha Error: ${createResponse.errorDescription || 'Unknown error'}`);
                }

                const taskId = createResponse.taskId;
                let finalToken: any = null;
                
                // 3. Запускаем цикл ожидания (до 24 раз по 5 секунд = 2 минуты)
                for (let attempt = 0; attempt < 24; attempt++) {
                    await sleep(5000);

                    const resultOptions: IHttpRequestOptions = {
                        method: 'POST',
                        url: 'https://api.2captcha.com/getTaskResult',
                        body: {
                            clientKey: clientKey,
                            taskId: taskId,
                        },
                        json: true,
                    };

                    const resultResponse = await this.helpers.httpRequest(resultOptions);

                    if (resultResponse.status === 'ready') {
                        const solution = resultResponse.solution;
                        finalToken = solution.gRecaptchaResponse || solution.token || solution.text || solution;
                        break;
                    }
                }

                if (!finalToken) {
                    throw new Error('Task timeout: Captcha was not solved within 2 minutes.');
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