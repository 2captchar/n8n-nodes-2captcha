import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class TwoCaptchaApi implements ICredentialType {
    name = 'twoCaptchaApi';
    displayName = '2Captcha API';
    // Исправлен путь до иконки (она лежит в папке с нодой)
    icon = 'file:../nodes/TwoCaptcha/2captcha.svg'as const;
    documentationUrl = 'https://2captcha.com/api-docs';

    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
    ];

    // Исправлена типизация (убрано "as IAuthenticateGeneric")
    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            body: {
                clientKey: '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.2captcha.com',
            url: '/getApiBalance',
            method: 'POST',
            body: {
                clientKey: '={{$credentials.apiKey}}',
            },
        },
    };
}