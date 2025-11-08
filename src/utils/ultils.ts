export const getNameIgnoreExtension = (filename: string) => {
  const file = filename.split('.')
  return file.slice(0, -1).join('.')
}

export const getExtension = (filename: string) => {
  const file = filename.split('.')
  return file.slice(-1).join('.')
}
