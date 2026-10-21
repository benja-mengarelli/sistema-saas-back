export const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) { responderError(res, error); }
};