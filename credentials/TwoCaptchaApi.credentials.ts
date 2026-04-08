import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TwoCaptchaApi implements ICredentialType {
    name = 'twoCaptchaApi';
    displayName = '2Captcha API';
    documentationUrl = 'https://2captcha.com/api-docs';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
            description: 'Твой API ключ от сервиса 2Captcha',
        },
    ];
}