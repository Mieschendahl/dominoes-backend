export { Socket } from "socket.io";

export function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

export function findMin<T>(
  items: T[],
  valueFn: (item: T) => number
): T[] {
  if (items.length === 0) return []

  let minValue = valueFn(items[0])
  let result: T[] = [items[0]]

  for (let i = 1; i < items.length; i++) {
    const item = items[i]
    const value = valueFn(item)

    if (value < minValue) {
      minValue = value
      result = [item]
    } else if (value === minValue) {
      result.push(item)
    }
  }

  return result
}