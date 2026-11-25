/**
 * 本地存储工具（localStorage 封装）
 * ------------------------------------------------------------
 * 作用：统一读写 JSON 数据，并对异常做兜底。
 *
 * 当前状态：会话数据已改为由后端持久化，前端 store 不再引用本文件；
 * 此处保留作为通用工具，后续如需缓存草稿、用户偏好等可继续使用。
 */

// 统一的存储键名，避免各处以不同 key 重复写入
const STORAGE_KEY = 'ai-assistant-conversations'

/**
 * 保存数据
 * @param data 任意可被 JSON.stringify 序列化的数据
 * @returns 是否保存成功
 *
 * 失败常见原因：隐私模式禁用 localStorage、存储空间已满。
 */
export function setStorage<T>(data: T): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('本地数据保存失败：', error)
    return false
  }
}

/**
 * 读取数据
 * @param defaultValue 不存在或解析失败时返回的默认值
 * @returns 解析后的数据
 */
export function getStorage<T>(defaultValue: T): T {
  try {
    const value = localStorage.getItem(STORAGE_KEY)

    // 从未写入过
    if (!value) {
      return defaultValue
    }

    return JSON.parse(value) as T
  } catch (error) {
    // 数据被篡改或不是合法 JSON 时，降级为默认值，避免页面白屏
    console.error('本地数据读取失败：', error)
    return defaultValue
  }
}

/**
 * 清除数据
 * @returns 是否清除成功
 */
export function removeStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('本地数据清除失败：', error)
    return false
  }
}
