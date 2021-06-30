process.env.ALLOWED_ACCOUNTS = '["foo_invalid_account_guid","foo_account_guid","foo_new_account_guid"]'

const GlobalCatalogAPI = require('../lib/internal/global-catalog-api')
const ResourceControllerAPI = require('../lib/internal/resource-controller-api')
const IBMidService = require('../lib/ibmid-service')
const AccountsAPI = require('../lib/internal/accounts-api')
const IAMAPI = require('../lib/internal/iam-api')
const { notLoggedInResponse } = require('../lib/responses')
const mockAxios = require('./mocks/axios')

let ibmidService
beforeEach(() => {
    let iamApi = new IAMAPI(mockAxios())
    let accountsApi = new AccountsAPI(mockAxios())
    let globalCatalogApi = new GlobalCatalogAPI(mockAxios())
    let resourceControllerApi = new ResourceControllerAPI(mockAxios())
    ibmidService = new IBMidService(mockAxios(), iamApi, accountsApi, globalCatalogApi, resourceControllerApi)
})

describe('IBMid service', () => {
    describe('default', () => {
        it('Should be a properly constructed instance of IBMidService', () => {
            expect(IBMidService.default.iamApi).toBeInstanceOf(IAMAPI)
            expect(IBMidService.default.accountsApi).toBeInstanceOf(AccountsAPI)
        })
    })
    describe('#getPasscode', () => {
        it('Redirects to passcode endpoint given by well known endpoint', (done) => {
            ibmidService.getPasscode({})
                .catch(err => done.fail(err))
                .then(data => {
                    expect(data).toEqual({
                        'body': {},
                        'headers': { 'location': 'foo_host/identity/passcode' },
                        'statusCode': 302,
                    })
                    done()
                })
        })
    })
    describe('#login', () => {
        describe('When login succeeds', () => {
            it('Generates an IAM token, lists accounts and refreshes the token with the first account guid', (done) => {
                ibmidService.login({ data: { passcode: 'foo_passcode' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'success': true, 'token': 'foo_refreshed_token_for_account_foo_account_guid', 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_account_guid' },
                            'headers': {
                                'Set-Cookie': [
                                    'token=foo_refreshed_token_for_account_foo_account_guid; Max-Age=1337; Path=/; HttpOnly',
                                    'refresh_token=foo_refresh_token_for_account_foo_account_guid; Max-Age=32088; Path=/; HttpOnly',
                                    'account_id=foo_account_guid; Max-Age=32088; Path=/; HttpOnly'
                                ]
                            },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When no accounts are allowed', () => {
            it('Returns RC 401', (done) => {
                ibmidService.login({ data: { passcode: 'foo_passcode_not_allowed' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When login fails', () => {
            it('Returns RC 401', (done) => {
                ibmidService.login({ data: { passcode: 'foo_passcode_invalid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'message': 'Provided passcode is invalid', 'success': false },
                            'statusCode': 401,
                        })
                        done()
                    })
            })
        })
    })
    describe('#logout', () => {
        it('Clears login related cookies', (done) => {
            ibmidService.logout({})
                .catch(err => done.fail(err))
                .then(data => {
                    expect(data).toEqual({
                        'body': { 'success': true },
                        'headers': { 'Set-Cookie': ['token=null; Max-Age=0; Path=/; HttpOnly', 'refresh_token=null; Max-Age=0; Path=/; HttpOnly', 'account_id=null; Max-Age=0; Path=/; HttpOnly'] },
                        'statusCode': 200,
                    })
                    done()
                })
        })
    })
    describe('#switchAccount', () => {
        describe('When token refresh succeeds', () => {
            it('Generates a new IAM token using new account guid', (done) => {
                ibmidService.switchAccount({ params: { account_id: 'foo_new_account_guid' }, headers: {}, 'cookies': { 'token': 'foo_token', 'refresh_token': 'foo_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_new_account_guid', 'success': true, 'token': 'foo_refreshed_token_for_account_foo_new_account_guid', },
                            'headers': { 'Set-Cookie': ['token=foo_refreshed_token_for_account_foo_new_account_guid; Max-Age=1337; Path=/; HttpOnly', 'refresh_token=foo_refresh_token_for_account_foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly', 'account_id=foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly'] },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When account id is not passed', () => {
            it('Refreshes the session', (done) => {
                ibmidService.switchAccount({ params: {}, headers: {}, 'cookies': { 'token': 'foo_token', 'refresh_token': 'foo_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_account_guid', 'success': true, 'token': 'foo_refreshed_token_for_account_foo_account_guid', },
                            'headers': { 'Set-Cookie': ['token=foo_refreshed_token_for_account_foo_account_guid; Max-Age=1337; Path=/; HttpOnly', 'refresh_token=foo_refresh_token_for_account_foo_account_guid; Max-Age=32088; Path=/; HttpOnly', 'account_id=foo_account_guid; Max-Age=32088; Path=/; HttpOnly'] },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When user tries to switch to a not allowed account', () => {
            it('Returns RC 401', (done) => {
                ibmidService.switchAccount({ params: { account_id: 'foo_not_allowed_account_guid' }, headers: {}, 'cookies': { 'token': 'foo_token', 'refresh_token': 'foo_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When token refresh fails', () => {
            it('Returns RC 401', (done) => {
                ibmidService.switchAccount({ params: { account_id: 'foo_new_account_guid' }, headers: {}, 'cookies': { 'token': 'foo_token', 'refresh_token': 'foo_invalid_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'message': 'Provided refresh_token is invalid', 'success': false },
                            'headers': {},
                            'statusCode': 401,
                        })
                        done()
                    })
            })
        })
        describe('When token is not present', () => {
            it('Refreshes token and switches account', (done) => {
                ibmidService.switchAccount({ params: { account_id: 'foo_new_account_guid' }, headers: {}, 'cookies': { 'refresh_token': 'foo_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_new_account_guid', 'success': true, 'token': 'foo_refreshed_token_for_account_foo_new_account_guid', },
                            'headers': {
                                'Set-Cookie': [
                                    'token=foo_refreshed_token_for_account_foo_new_account_guid; Max-Age=1337; Path=/; HttpOnly',
                                    'refresh_token=foo_refresh_token_for_account_foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly',
                                    'account_id=foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly'
                                ]
                            },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When refresh token is not present', () => {
            it('Returns RC 401', (done) => {
                ibmidService.switchAccount({ params: { account_id: 'foo_new_account_guid' }, headers: {}, cookies: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
    })
    describe('#getOwnUser', () => {
        describe('When account listing succeeds (valid token)', () => {
            it('Returns the user with their accounts', (done) => {
                ibmidService.getOwnUser({ headers: {}, 'cookies': { 'token': 'eyJraWQiOiIyMDIwMTEyMTE4MzQiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.ydIq72Q8StGFtH55QBJj6uhugHl8XZXROUR5IAkzrHM', 'refresh_token': 'foo_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': { 'account': 'foo_account_guid', 'accounts': [{ 'metadata': { 'guid': 'foo_invalid_account_guid' } }, { 'metadata': { 'guid': 'foo_account_guid' } }, { 'metadata': { 'guid': 'foo_new_account_guid' } }], 'foo': 'bar' },
                        })
                        done()
                    })
            })
        })
        describe('When account listing fails (invalid token)', () => {
            it('Returns RC 401', (done) => {
                ibmidService.getOwnUser({ headers: {}, 'cookies': { 'token': 'eyJraWQiOiIyMDIwMTEyMTE4MzQiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.ydIq72Q8StGFtH55QBJj6uhugHl8XZXROUR5IAkzrHM_invalid', 'refresh_token': 'foo_refresh_token', 'account_id': 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
    })
    describe('#manageResource', () => {
        it('Forwards the request to the service URL', (done) => {
            ibmidService.manageResource({ method: "FOO_METHOD", url: "", "urlParams": { "resource_id": "foo_resource_id" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                .catch(err => done.fail(err))
                .then(data => {
                    expect(data).toEqual({
                        "statusCode": 200,
                        "headers": {},
                        "body": { "id": "foo_resource_id", "guid": "foo_resource_guid" },
                    })
                    done()
                })
        })
        describe('When the service management fails', () => {
            it('Forwards the error response', (done) => {
                ibmidService.manageResource({ method: "FOO_METHOD", url: "", "urlParams": { "resource_id": "foo_resource_id_error" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            "statusCode": 500,
                            "headers": { "foo": "error-headers" },
                            "body": { "foo": "error" },
                        })
                        done()
                    })
            })
        })
    })
    describe('#proxy', () => {
        describe('For default services', () => {
            it('Forwards the request to the service URL', (done) => {
                ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_path", "urlParams": { "resource_id": "foo_resource_id" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            "statusCode": 200,
                            "headers": { "foo": "headers" },
                            "body": { "foo": "data" },
                        })
                        done()
                    })
            })
            describe('When the service has no keys', () => {
                it('Returns RC 404', (done) => {
                    ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_endpoint", "urlParams": { "resource_id": "foo_resource_id_no_keys" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({
                                "statusCode": 404,
                                "headers": {},
                                "body": { "message": "Resource not found" },
                            })
                            done()
                        })
                })
            })
            describe('When the service has no keys, but is a conversation instance', () => {
                it('Forwards the request to the service URL', (done) => {
                    ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_endpoint", "urlParams": { "resource_id": "foo_resource_id_no_keys_conversation" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({
                                "statusCode": 200,
                                "headers": { "foo": "headers" },
                                "body": { "foo": "data" },
                            })
                            done()
                        })
                })
            })
            describe('When service request fails', () => {
                it('Forwards the error response', (done) => {
                    ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_path_error", "urlParams": { "resource_id": "foo_resource_id" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ "body": { "foo": "error" }, "headers": { "foo": "error-headers" }, "statusCode": 500 })
                            done()
                        })
                })
            })
            describe('When service is not found', () => {
                it('Responds with RC 404', (done) => {
                    ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_path", "urlParams": { "resource_id": "foo_resource_id_missing" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ "body": { "message": "Resource not found" }, "headers": {}, "statusCode": 404 })
                            done()
                        })
                })
            })
        })
        describe('For dashboard services', () => {
            it('Does not include authorization headers in request', (done) => {
                ibmidService.proxy({ method: "FOO_METHOD", url: "/daas/foo_path", "urlParams": { "resource_id": "foo_resource_id_dashboards" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ "body": { "foo": "data" }, "headers": { "foo": "headers" }, "statusCode": 200 })
                        done()
                    })
            })
        })
        describe('For DSX resources', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_path", "urlParams": { "resource_id": "foo_resource_id_dsx" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ "body": { "foo": "data" }, "headers": { "foo": "headers" }, "statusCode": 200 })
                        done()
                    })
            })
        })
        describe('For functions services', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: "FOO_METHOD", url: "/foo_path", "urlParams": { "resource_id": "foo_resource_id_functions" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ "body": { "foo": "data" }, "headers": { "foo": "headers" }, "statusCode": 200 })
                        done()
                    })
            })
        })
        describe('For functions web services', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: "FOO_METHOD", url: "/web/foo_path", "urlParams": { "resource_id": "foo_resource_id_functions" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ "body": { "foo": "data" }, "headers": { "foo": "headers" }, "statusCode": 200 })
                        done()
                    })
            })
        })
        describe('For functions system services', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: "FOO_METHOD", url: `/foo_path`, "urlParams": { "resource_id": "crn:v1:bluemix:public:functions:us-south:a/f9aa503dffc94e4cec4f8f104a39ec72:whisk.system::" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ "body": { "foo": "data" }, "headers": { "foo": "headers" }, "statusCode": 200 })
                        done()
                    })
            })
        })
        describe('For global services', () => {
            describe('When service endpoint is provided', () => {
                it('Builds URL from endpoints response', (done) => {
                    ibmidService.proxy({ method: "FOO_METHOD", url: `/foo_path`, "urlParams": { "resource_id": "foo_resource_id_endpoints" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: { 'x-endpoint-id': 'foo:path:to:endpoint' } })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ "body": { "foo": "data" }, "headers": { "foo": "headers" }, "statusCode": 200 })
                            done()
                        })
                })
            })
            describe('When no service endpoint is provided', () => {
                it('Returns RC 400', (done) => {
                    ibmidService.proxy({ method: "FOO_METHOD", url: `/foo_path`, "urlParams": { "resource_id": "foo_resource_id_endpoints" }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' }, headers: {} })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ "body": { "message": "Resource not found" }, "headers": {}, "statusCode": 404 })
                            done()
                        })
                })
            })
        })
    })
    describe('#listResources', () => {
        describe('When a query for resource type is passed', () => {
            it('Lists resources of that type', (done) => {
                ibmidService.listResources({ url: "", "params": { q: 'foo_catalog_name_1' }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            "statusCode": 200,
                            "headers": {},
                            "body": {
                                next_url: null,
                                rows_count: 4,
                                resources: ["foo_resource_1", "foo_resource_2", "foo_resource_3", "foo_resource_4"]
                            },
                        })
                        done()
                    })
            })
        })
        describe('When no catalog entry is found for query', () => {
            it('Lists resources of that type', (done) => {
                ibmidService.listResources({ url: "", "params": { q: 'foo_catalog_name_4' }, "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            "statusCode": 404,
                            "headers": {},
                            "body": {
                                "message": "Resource not found"
                            },
                        })
                        done()
                    })
            })
        })
        describe('When no query for resource type is passed', () => {
            it('Lists all resources', (done) => {
                ibmidService.listResources({ url: "", "cookies": { "token": 'foo_token', "refresh_token": 'foo_refresh_token', "account_id": 'foo_account_guid' } })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            "statusCode": 200,
                            "headers": {},
                            "body": {
                                next_url: null,
                                rows_count: 4,
                                resources: ["foo_resource_1", "foo_resource_2", "foo_resource_3", "foo_resource_4"]
                            },
                        })
                        done()
                    })
            })
        })
    })
})