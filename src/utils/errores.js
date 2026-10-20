export const errorHttp = (status, message) => Object.assign(new Error(message), { status });

/* export const responderError = (res, error) => {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    if (error.name === 'CastError') return res.status(400).json({ message: 'Id inválido' });
    const status = error.status || 500;
    if (status === 500) console.error(error);
    res.status(status).json({ message: status === 500 ? 'Error del servidor' : error.message });
}; */

export const responderError = (res, error) => {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    if (error.name === 'CastError') return res.status(400).json({ message: 'Id inválido' });
    const status = error.status || 500;
    if (status === 500) console.error('ERROR 500:', error);
    res.status(status).json({
        message: status === 500 ? 'Error del servidor' : error.message,
        ...(status === 500 && { detalle: error.message, donde: error.stack?.split('\n').slice(0, 4) }), // TEMPORAL
    });
};