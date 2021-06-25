import { AxiosStatic } from "axios"

interface Request {
    url?: string,
    urlParams?: { [key: string]: any },
    headers?: { [key: string]: any },
    cookies?: { [key: string]: any },
    data?: any,
    params?: { [key: string]: any },
    method?: string
}

interface Response {
    statusCode: number,
    headers?: { [key: string]: any },
    body?: any
}

declare class IBMidService {

    static default: IBMidService

    constructor(sendRequest: any)

    getPasscode(options: Request): Promise<Response>
    
    login(options: Request): Promise<Response>
    
    logout(options: Request): Promise<Response>
    
    switchAccount(options: Request): Promise<Response>
    
    getOwnUser(options: Request): Promise<Response>
    
    authenticatedFunction(func: (options: Request) => Promise<Response>): (options: Request) => Promise<Response>

}

export default IBMidService