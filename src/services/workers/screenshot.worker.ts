self.onmessage = (e: MessageEvent) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, op, payload } = e.data
  // Placeholder — will be implemented in Task 8
  self.postMessage({ id, status: 'ok', result: null })
}
