const { badRequest } = require('../utils/response.utils');

const validate = (schema, property='body') => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly:false });
  if (error) {
    const messages = error.details.map(d => d.message).join(', ');
    return badRequest(res, messages);
  }
  next();
};

module.exports = validate;
