// Sanitización manual de inputs Mongo (sin mutar req.query/params en Express 5)
const sanitizeValue = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
        continue;
      }
      sanitizeValue(value[key]);
    }
  } else if (Array.isArray(value)) {
    value.forEach(sanitizeValue);
  }
  return value;
};

export const sanitize = (req, _res, next) => {
  if (req.body) sanitizeValue(req.body);
  next();
};
