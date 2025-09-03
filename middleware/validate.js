// Wrapper de validation Zod pour body/params/query

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message } });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
