import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { Solver } from '2captcha-ts';

export class TwoCaptcha implements INodeType {
    description: INodeTypeDescription = {
        displayName: '2Captcha',
        name: 'twoCaptcha',
        icon: 'file:2captcha.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Bypass captchas automatically using 2Captcha API',
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
                    { name: 'GeeTest (v3)', value: 'geetest' },
                    { name: 'GeeTest (v4)', value: 'geetestV4' },
                    { name: 'Amazon WAF', value: 'amazonWaf' },
                    { name: 'Lemin Cropped', value: 'lemin' },
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
                            'turnstile', 'recaptchaV2', 'recaptchaV3', 'recaptchaEnterprise', 
                            'hcaptcha', 'geetest', 'geetestV4', 'amazonWaf', 'lemin'
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
                            'turnstile', 'recaptchaV2', 'recaptchaV3', 'recaptchaEnterprise', 
                            'hcaptcha', 'amazonWaf'
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
            // 4. ПОЛЯ ДЛЯ GEETEST
            // ==========================================
            {
                displayName: 'GT Key',
                name: 'gt',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['geetest'] },
                },
            },
            {
                displayName: 'Challenge',
                name: 'challenge',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['geetest'] },
                },
            },
            {
                displayName: 'Captcha ID',
                name: 'geetestV4Id',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['geetestV4'] },
                },
            },

            // ==========================================
            // 5. ПОЛЯ ДЛЯ AMAZON WAF
            // ==========================================
            {
                displayName: 'IV',
                name: 'amazonIv',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['amazonWaf'] },
                },
            },
            {
                displayName: 'Context',
                name: 'amazonContext',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['amazonWaf'] },
                },
            },

            // ==========================================
            // 6. ПОЛЯ ДЛЯ LEMIN
            // ==========================================
            {
                displayName: 'Captcha ID',
                name: 'leminCaptchaId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['lemin'] },
                },
            },
            {
                displayName: 'Div ID',
                name: 'leminDivId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { operation: ['lemin'] },
                },
            },

            // ==========================================
            // 7. ОБЫЧНАЯ КАРТИНКА
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
        
        const solver = new Solver(credentials.apiKey as string);

        for (let i = 0; i < items.length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i) as string;
                let result;

                const url = this.getNodeParameter('url', i, '') as string;
                const sitekey = this.getNodeParameter('sitekey', i, '') as string;

                switch (operation) {
                    case 'turnstile':
                        result = await solver.cloudflareTurnstile({ pageurl: url, sitekey });
                        break;
                    case 'recaptchaV2':
                        result = await solver.recaptcha({ pageurl: url, googlekey: sitekey });
                        break;
                    case 'recaptchaV3':
                        result = await solver.recaptcha({ 
                            pageurl: url, 
                            googlekey: sitekey, 
                            version: 'v3',
                            action: this.getNodeParameter('action', i) as string,
                            min_score: this.getNodeParameter('minScore', i) as number
                        });
                        break;
                    case 'recaptchaEnterprise':
                        result = await solver.recaptcha({ 
                            pageurl: url, 
                            googlekey: sitekey, 
                            enterprise: 1,
                            action: this.getNodeParameter('action', i) as string
                        });
                        break;
                    case 'hcaptcha':
                        result = await solver.hcaptcha({ pageurl: url, sitekey });
                        break;
                    case 'geetest':
                        result = await solver.geetest({ 
                            pageurl: url, 
                            gt: this.getNodeParameter('gt', i) as string,
                            challenge: this.getNodeParameter('challenge', i) as string 
                        });
                        break;
                    case 'geetestV4':
                        result = await solver.geetestV4({ 
                            pageurl: url, 
                            captcha_id: this.getNodeParameter('geetestV4Id', i) as string 
                        });
                        break;
                    case 'amazonWaf':
                        result = await solver.amazonWaf({ 
                            pageurl: url, 
                            sitekey, 
                            iv: this.getNodeParameter('amazonIv', i) as string,
                            context: this.getNodeParameter('amazonContext', i) as string
                        });
                        break;
                    case 'lemin':
                        result = await solver.lemin({ 
                            pageurl: url, 
                            captcha_id: this.getNodeParameter('leminCaptchaId', i) as string,
                            div_id: this.getNodeParameter('leminDivId', i) as string 
                        });
                        break;
                    case 'normal':
                        // Теперь передаем строго строку, как того просит TS
                        result = await solver.imageCaptcha(this.getNodeParameter('base64', i) as string);
                        break;
                    default:
                        throw new Error(`Unsupported operation: ${operation}`);
                }

                returnData.push({
                    json: {
                        success: true,
                        taskId: result?.id,
                        token: result?.data,
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