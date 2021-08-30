const { publicKey } = require('../tokens')

const mockJwksClient = {
    getSigningKey: (kid, cb) => cb(null, { publicKey }),
}
module.exports = mockJwksClient