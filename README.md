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

As a standalone module: (see JSDoc for required parameters for each method)

```js
const { default: IBMidLogin } = require('ibmid-login')

const ibmidLogin = new IBMidLogin()
await ibmidLogin.getPasscode() // => { headers: { location: "https://identity-1.us-south.iam.cloud.ibm.com/identity/passcode" }, statusCode: 302, body: {} }
```

As an Express.js Router:

```js
const express = require('express')
const app = express()

/**
 * GET  /ibmid/passcode --> Generates an IBM Cloud one-time passcode when opened in a browser
 * POST /ibmid/login --> Send { passcode: "<PASSCODE FROM IBM CLOUD>" } to start a session (cookies)
 * POST /ibmid/logout --> Clears session (cookies)
 * GET  /ibmid/users/me --> Returns current user
 * GET  /ibmid/accounts --> Returns current user's accounts
 * GET  /ibmid/accounts --> Returns current user's accounts
 * GET  /ibmid/accounts/switch --> Send ?account_id=<NEW_ACCOUNT_ID> to switch accounts
 * GET  /ibmid/resources --> Lists resource instances
 * ALL  /ibmid/resources/:resource_id --> Resource controller API for a resource - https://cloud.ibm.com/apidocs/resource-controller/resource-controller
 * ALL  /ibmid/resources/:resource_id/<path> --> Proxy requests to the service URL.
 * e.g. If resource_id is a Watson Assistant instance, /ibmid/resources/:resource_id/v1/workspaces will proxy to the instance's /v1/workspaces endpoint.
 */
app.use('/ibmid', services.ibmid.expressAdapter)
/**
 * Authenticates all routes under /protected, redirects to /login
 */
app.use('/protected', services.ibmid.expressAdapter.authenticate({ fallback_url: '/login' }))
```

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