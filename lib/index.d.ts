interface Response {
    statusCode: number,
    headers?: { [key: string]: any },
    body?: any
}

declare class IBMidService {

    static default: IBMidService

    constructor()

    getPasscode(): Promise<Response>

    login(options: { apikey: string, passcode: string }): Promise<Response>

    logout(): Promise<Response>

    switchAccount(options: { refreshToken: string, accountID: string }): Promise<Response>

    getOwnUser(options: { token: string }): Promise<Response>

    listAccounts(options: { token: string }): Promise<Response>

    listResources(options: { token: string, resourceType: string }): Promise<Response>

    manageResource(options: { token: string, resourceID: string, url: string, method: string, body: any }): Promise<Response>

    proxy(options: { token: string, resourceID: string, url: string, method: string, headers: any, data: any }): Promise<Response>

}

export default IBMidService