export default function makePatchSchema<T extends Record<string, any>>(schema: T): T {
  const newSchema: any = {}
  for (const key in schema) {
    const rules = { ...schema[key] }
    if (rules.notEmpty) {
      delete rules.notEmpty
      rules.optional = true
    }
    newSchema[key] = rules
  }
  return newSchema
}
