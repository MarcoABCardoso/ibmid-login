function notLoggedInResponse() {
    return { statusCode: 401, body: { status: 401, message: 'Unauthorized' }, headers: {} }
}

module.exports = { notLoggedInResponse }