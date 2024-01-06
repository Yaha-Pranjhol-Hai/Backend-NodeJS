// It is a higher order function and helps in handling asynchronous operations like web requests by catching errors and passes to the next middleware function.
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
