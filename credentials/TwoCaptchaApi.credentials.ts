import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class TwoCaptchaApi implements ICredentialType {
    name = 'twoCaptchaApi';
    displayName = '2Captcha API';
    icon = 'file:2captcha.svg';
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

    // n8n автоматически подставит clientKey в тело любого POST-запроса
    authenticate = {
        type: 'generic',
        properties: {
            body: {
                clientKey: '={{$credentials.apiKey}}',
            },
        },
    } as IAuthenticateGeneric;

    // Функция проверки ключа прямо из окна создания Credentials
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