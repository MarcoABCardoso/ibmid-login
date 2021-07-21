import { Router } from "express"

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

    constructor()

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