const cookieParser = require('cookie-parser')
const express = require('express')
const { getToken } = require('./utils')

function fromExpress(req) {
    return {
        passcode: req.body.passcode,
        token: getToken(req),
        refreshToken: req.cookies.refresh_token,
        accountID: req.query.account_id || req.cookies.account_id,

        resourceType: req.query.resource_type,
        resourceID: req.params.resource_id,
        url: req.originalUrl.split('?')[0].replace(req.baseUrl, ''),
        method: req.method,
        headers: req.headers,
        params: req.query,
        data: req.body
    }
}

function toExpress(res, next, options, error) {
    for (let key in options.headers)
        if (key !== 'transfer-encoding')
            res.set(key, options.headers[key])
    if (options.statusCode) {
        return res.status(options.statusCode).json(options.body)
    }
    next(error)
}

function expressify(serviceFunction) {
    return async function (req, res, next) {
        let options = fromExpress(req)
        let response = await serviceFunction(options)
            .catch(error => ({ error }))
        return toExpress(res, next, response, response.error)
    }
}

function getExpressAdapter(ibmidService) {
    let router = new express.Router()

    router.use(cookieParser())
    router.use(express.json({ limit: '50mb' }))
    router.use(express.urlencoded({ extended: false }))
    router.use((_err, _req, res, _next) => res.status(400).json({ status: 400, message: 'Invalid Request data' }))

    router.get('/passcode', expressify(ibmidService.getPasscode))
    router.post('/login', expressify(ibmidService.login))

    router.authenticate = (authOptions) => (req, res, next) => {
        return expressify(async options => {
            let userData = await ibmidService.getOwnUser(options)
            if (userData.statusCode >= 400) return authOptions.fallback_url && options.headers.accept && options.headers.accept.includes('text/html') ? { headers: { location: authOptions.fallback_url }, statusCode: 302, body: {} } : userData
            req.ibmid = { user: userData.body, token: options.token }
            return {}
        })(req, res, next)
    }

    router.use(router.authenticate({}))

    router.post('/logout', expressify(ibmidService.logout))
    router.get('/users/me', expressify(ibmidService.getOwnUser))
    router.get('/accounts', expressify(ibmidService.listAccounts))
    router.get('/accounts/switch', expressify(ibmidService.switchAccount))
    router.get('/resources', expressify(ibmidService.listResources))

    let resourceRouter = new express.Router({ mergeParams: true })
    resourceRouter.all('/', (req, res, next) => expressify(req.headers['x-endpoint-id'] ? ibmidService.proxy : ibmidService.manageResource)(req, res, next))
    resourceRouter.all('/resource_keys', expressify(ibmidService.manageResource))
    resourceRouter.use('/', expressify(ibmidService.proxy))
    router.use('/resources/:resource_id', resourceRouter)


    return router
}

module.exports = getExpressAdapter