function getToken(req) {
    // Already authenticated
    if (req.ibmid) return req.ibmid.token
    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.toLowerCase().startsWith('bearer ')) return req.headers.authorization.split('Bearer ')[1]
    // Fallback to cookies
    return req.cookies.token
}

module.exports = {
    getToken
}