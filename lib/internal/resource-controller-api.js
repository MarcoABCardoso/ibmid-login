const BaseService = require('./base-service')
const { RESOURCE_CONTROLLER_URL } = require('../config/constants')

class ResourceControllerAPI extends BaseService {
    listResources(options) {
        return this.sendRequest({
            url: `${RESOURCE_CONTROLLER_URL}${options.next_url}`,
            method: 'GET',
            params: {
                resource_id: options.resource_id,
                limit: options.limit
            },
            headers: { Authorization: `Bearer ${options.token}` }
        })
            .then(response => response.data)
    }
    async listAllResources(options) {
        let resources = []
        let resourceListData = { next_url: '/v2/resource_instances', resources: [], rows_count: 1 }
        while (resourceListData.next_url && resourceListData.rows_count) {
            resources.push(...resourceListData.resources)
            resourceListData = await this.listResources({ ...options, next_url: resourceListData.next_url })
        }
        resources.push(...resourceListData.resources)
        return {
            resources: resources,
            rows_count: resources.length,
            next_url: null
        }
    }
    getResource(options) {
        return this.sendRequest({
            url: `${RESOURCE_CONTROLLER_URL}/v2/resource_instances/${encodeURIComponent(options.resource_id)}`,
            method: 'GET',
            headers: { Authorization: `Bearer ${options.token}` }
        })
            .then(response => response.data)
    }
    listResourceKeys(options) {
        return this.sendRequest({
            url: `${RESOURCE_CONTROLLER_URL}/v2/resource_instances/${encodeURIComponent(options.resource_id)}/resource_keys`,
            method: 'GET',
            headers: { Authorization: `Bearer ${options.token}` }
        })
            .then(response => response.data)
    }
}

ResourceControllerAPI.default = new ResourceControllerAPI()

module.exports = ResourceControllerAPI