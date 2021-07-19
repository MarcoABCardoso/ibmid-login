const BaseService = require('./base-service')
const { RESOURCE_CONTROLLER_URL } = require('../config/constants')

class ResourceControllerAPI extends BaseService {
    listResources({ token, resourceID, limit, nextURL }) {
        return this.sendRequest({
            url: `${RESOURCE_CONTROLLER_URL}${nextURL}`,
            method: 'GET',
            params: {
                resource_id: resourceID,
                limit: limit
            },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.data)
    }
    async listAllResources({ token, resourceID }) {
        let resources = []
        let resourceListData = { next_url: '/v2/resource_instances', resources: [], rows_count: 1 }
        while (resourceListData.next_url && resourceListData.rows_count) {
            resources.push(...resourceListData.resources)
            resourceListData = await this.listResources({ token, resourceID, nextURL: resourceListData.next_url })
        }
        resources.push(...resourceListData.resources)
        return {
            resources: resources,
            rows_count: resources.length,
            next_url: null
        }
    }
    manageResource({ token, resourceID, url, method, body }) {
        return this.sendRequest({
            method: method,
            data: body,
            url: `${RESOURCE_CONTROLLER_URL}/v2/resource_instances/${encodeURIComponent(resourceID)}${url}`,
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => ({ statusCode: response.status, body: response.data, headers: response.headers || {} }))
            .catch(err => ({ statusCode: err.response.status, body: err.response.data, headers: err.response.headers }))
    }
}

ResourceControllerAPI.default = new ResourceControllerAPI()

module.exports = ResourceControllerAPI