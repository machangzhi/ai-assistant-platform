const STORAGE_KEY = 'ai-assistant-conversations'

/**
 * 保存数据
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
 */
export function getStorage<T>(defaultValue: T): T {
  try {
    const value = localStorage.getItem(STORAGE_KEY)

    if (!value) {
      return defaultValue
    }

    return JSON.parse(value) as T
  } catch (error) {
    console.error('本地数据读取失败：', error)
    return defaultValue
  }
}

/**
 * 清除数据
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
