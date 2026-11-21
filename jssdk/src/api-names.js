/**
 * 首期只挂调通用的接口；后续再按「name-async|sync-function|event」扩展。
 * 格式：apiName-并行性-类型[-lackCallback]
 *
 * ready / config / error 由 Invoke 提供，不走本表扁平化，但原生仍须响应 ready/config。
 * 机器可读清单：../apis.json（sync 会拷到各端，供原生对照）。
 */
export default {
  apis: [
    'ping-async-function',
  ],
}
