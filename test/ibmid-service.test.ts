process.env.ALLOWED_ACCOUNTS = '["foo_invalid_account_guid","foo_account_guid","foo_new_account_guid"]'
const IBMidService = require('../lib/ibmid-service')
const AccountsAPI = require('../lib/internal/accounts-api')
const IAMAPI = require('../lib/internal/iam-api')
const { notLoggedInResponse } = require('../lib/responses')
const mockAxios = require('./mocks/axios')

let ibmidService
beforeEach(() => {
    let iamApi = new IAMAPI(mockAxios())
    let accountsApi = new AccountsAPI(mockAxios())
    ibmidService = new IBMidService(mockAxios(), iamApi, accountsApi)
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
})