import { AxiosRequestConfig, AxiosResponse } from "axios"
import { Router, Handler } from "express"

interface Response {
    statusCode: number,
    headers?: { [key: string]: any },
    body?: any
}

interface ExpressAdapter extends Router {
    authenticate: ({ fallback_url: string }) => Handler
}

declare class IBMidService {

    static default: IBMidService

    expressAdapter: ExpressAdapter

    constructor(options: {
        IAM_URL?: string,
        ACCOUNTS_URL?: string,
        RESOURCE_CONTROLLER_URL?: string,
        GLOBAL_CATALOG_URL?: string,
        RESOURCE_SERVICE_CACHE_TIMEOUT?: number,
        GLOBAL_CATALOG_API_CACHE_TIMEOUT?: number,
        IAM_OPENID_CONFIG_CACHE_TIMEOUT?: number,

        ALLOWED_ACCOUNTS?: string[],
        ALLOWED_USERS?: string[],
        IBMID_APIKEY?: string,
        IBMID_APIKEY_LOGIN_CACHE_TIMEOUT?: number
    }, requestApi?: (options: AxiosRequestConfig) => Promise<AxiosResponse>)

    getPasscode(): Promise<Response>

    login(options: { apikey: string, passcode: string }): Promise<Response>

    logout(): Promise<Response>

    switchAccount(options: { refreshToken: string, accountID: string }): Promise<Response>

    getOwnUser(options: { token: string }): Promise<Response>

    listAccounts(options: { token: string }): Promise<Response>

    listResources(options: { token: string, resourceType: string }): Promise<Response>

    manageResource(options: { token: string, resourceID: string, url: string, method?: string, params?: any, data?: any }): Promise<Response>

    proxy(options: { token: string, resourceID: string, url: string, method?: string, headers?: any, params?: any, data?: any }): Promise<Response>

}

export default IBMidService