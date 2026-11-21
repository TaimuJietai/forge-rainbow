/**
 * 任务池：sync 串行排队，async 直接执行。
 * 参考 hybrid-jssdk-test-page/src/es5/modules/SyncTask.js
 */
import Invoke from './Invoke.js'

export default function SyncTask() {
  Invoke.call(this)

  var STATUS = {
    idle: 'Idle',
    pending: 'pending',
  }
  var status = STATUS.idle
  var taskList = []
  var self = this

  function shiftTask() {
    taskList.shift()
    if (taskList.length) {
      postNext()
    } else {
      status = STATUS.idle
    }
  }

  function postNext() {
    status = STATUS.pending
    var current = (taskList && taskList[0]) || {}
    var apiName = current.apiName || ''
    var eventType = current.eventType || 'function'
    var params = current.params || {}
    var lackCallback = current.lackCallback || false

    if (!apiName) {
      self.processResult(params, { msg: 'postMessage api name is empty.' })
      shiftTask()
      return
    }

    self.invoke({
      active: apiName,
      eventType: eventType,
      params: params,
      lackCallback: lackCallback,
      callback: function (res) {
        self.processResult(params, res)
        shiftTask()
      },
    })
  }

  this.messageOn = function (messageOnParams) {
    messageOnParams = messageOnParams || {}
    var apiName = messageOnParams.apiName || ''
    if (!apiName) {
      throw new Error('messageOn api name is empty.')
    }

    var isAsync = messageOnParams.isAsync || 'sync'
    var eventType = messageOnParams.eventType || 'function'
    var params = messageOnParams.params || {}
    var isRepeatable =
      typeof messageOnParams.isRepeatable === 'undefined'
        ? true
        : messageOnParams.isRepeatable
    var lackCallback = messageOnParams.lackCallback || false

    if (isAsync === 'sync') {
      var exists = false
      for (var i = 0; i < taskList.length; i++) {
        if (taskList[i].apiName === apiName) {
          exists = true
          break
        }
      }
      if (!isRepeatable && exists) {
        var res = { msg: 'Task already exists.' }
        this.sayError(res, params)
        if (params && this.isFunction(params.complete)) {
          params.complete(res)
        }
        return
      }

      taskList.push({
        apiName: apiName,
        isAsync: isAsync,
        eventType: eventType,
        isRepeatable: isRepeatable,
        lackCallback: lackCallback,
        params: params,
      })

      if (status === STATUS.idle) {
        postNext()
      }
    } else {
      this.invoke({
        active: apiName,
        eventType: eventType,
        params: params,
        lackCallback: lackCallback,
      })
    }
  }
}
