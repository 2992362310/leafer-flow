export function camelToSnake(str: string) {
  return str
    .replace(/([A-Z])/g, (match, p1, offset) => {
      // 如果是第一个字符，直接转为小写，否则前面加下划线
      return (offset > 0 ? '_' : '') + p1.toLowerCase();
    })
    .toLowerCase();
}


// 格式化时间显示
export const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
