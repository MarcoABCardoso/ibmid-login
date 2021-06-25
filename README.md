<h1 align="center">ibmid-login</h1>
<p>
  <a href="https://www.npmjs.com/package/ibmid-login" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/ibmid-login.svg">
  </a>
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
  <a href='https://coveralls.io/github/MarcoABCardoso/ibmid-login?branch=master'>
    <img src='https://coveralls.io/repos/github/MarcoABCardoso/ibmid-login/badge.svg?branch=master' alt='Coverage Status' />
  </a>
  <a href="#" target="_blank">
    <img alt="Node.js CI" src="https://github.com/MarcoABCardoso/ibmid-login/workflows/Node.js%20CI/badge.svg" />
  </a>
</p>

> Integrates with the IBM Identity and Account Management (IAM) and Accounts APIs to implement login using IBMid.

## Install

```sh
npm install ibmid-login
```

## Usage

All methods receive and return data for HTTP requests:

```ts
interface Request {
    headers?: { [key: string]: any }, // Request headers
    cookies?: { [key: string]: any }, // Request cookies
    data?: any,                       // Request body (JSON)
    params?: { [key: string]: any },  // Request query parameters
}

interface Response {
    statusCode: number,               // Status to be returned to the client
    headers?: { [key: string]: any }, // Headers to be returned to the client
    body?: any                        // JSON body to be returned to the client
}
```
The application is expected to obtain these parameters from the request, and provide the response according to the web framework used (if any).

The package provides the following methods:

- `getPasscode(options: Request): Promise<Response>`

Open a new tab to this endpoint to generate a passcode the end user can log in with;

- `login(options: Request): Promise<Response>`

Send `{ passcode: "<PASSCODE FROM IBM CLOUD>" }` to this endpoint to log in. The session will be stored as a cookie;

- `logout(options: Request): Promise<Response>`

Requesting this endpoint will erase the session's cookies;

- `switchAccount(options: Request): Promise<Response>`

Send `?account_id=<NEW_ACCOUNT_ID>` to this endpoint to switch to another account. Use the method below to view available accounts;

- `getOwnUser(options: Request): Promise<Response>`

Send a GET to this endpoint to switch to view user details, including accounts they have access to;

## Run tests

```sh
npm run test
```

## Author

👤 **Marco Cardoso**

* Github: [@MarcoABCardoso](https://github.com/MarcoABCardoso)
* LinkedIn: [@marco-cardoso](https://linkedin.com/in/marco-cardoso)

## Show your support

Give a ⭐️ if this project helped you!