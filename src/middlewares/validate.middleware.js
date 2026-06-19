const { validationError } = require('../utils/response.utils');

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false });
  if (error) {
    const erreurs = error.details.map(d => ({
      champ: d.path.join('.'),
      message: d.message.replace(/['"]/g, '')
    }));
    return validationError(res, 'Données invalides', erreurs);
  }
  next();
};

module.exports = validate;
