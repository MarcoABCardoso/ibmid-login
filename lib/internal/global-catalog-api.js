const BaseService = require('./base-service')
const { GLOBAL_CATALOG_URL } = require('../config/constants')

class GlobalCatalogAPI extends BaseService {

    listCatalogEntries({ resourceType }) {
        return this.sendRequest({
            url: `${GLOBAL_CATALOG_URL}/api/v1`,
            method: 'GET',
            params: {
                include: '*',
                q: resourceType
            },
            headers: { Authorization: `Basic ${Buffer.from('bx:bx').toString('base64')}` }
        })
            .then(response => response.data)
    }
}

GlobalCatalogAPI.default = new GlobalCatalogAPI()

module.exports = GlobalCatalogAPI