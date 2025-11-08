import argv from 'minimist'
export const isDevelopment = (): boolean => {
  const options = argv(process.argv.slice(2))
  return Boolean(options.development)
}
